const Imap = require('node-imap');
const path = require('path')
const {Base64Decode} = require('base64-stream')
const fs = require('fs');
const { error } = require('console');

const functionality = async(user,password,host,port,tls,fileLocations,allowedFileTypes)=>{
    const emailInfo = [];

    const imap = new Imap({
        user:user,
        password:password,
        host:host,
        port:parseInt(port),
        tls,
        tlsOptions:{rejectUnauthorized:false}
    })

    const ensurePathExists = async(targetPath)=>{
        try{
            await fs.promises.mkdir(targetPath,{recursive:true})
        }catch(err){
            if(error.code !== 'EEXIST') throw error;
        }
    }

    const getTimeStamp = () => {
        const now = new Date()
        const year = now.getFullYear();
        const month = (now.getMonth()+1).toString.padStart(2,'0')
        const day = now.getDate().toString().padStart(2,'0')
        const hours = now.getHours().toString().padStart(2,'0')
        const minutes = now.getMinutes().toString().padStart(2,'0')
        const seconds = now.getSeconds().toString().padStart(2,'0')

        return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`
    }

    const findAttachments = (struct,attachments)=>{
        attachments = attachments ?? []

        for(let i = 0,len = struct.length;i<len;i++){
            if(Array.isArray(struct[i])){
                findAttachments(struct[i],attachments)
            }else{
                if(struct[i].disposition && ['inline','attachment'].indexOf(struct[i].disposition.type.toLowerCase()) > -1){
                    attachments.push(struct[i])
                }
            }
        }
        return attachments
    }
    
    const buildAtMessageFunction=(attachment,emailData)=>{
        const filename = attachment.params.name;
        const encoding = attachment.encoding;

        const timeStamp = getTimeStamp()

        return function(msg,seqno){
            const prefix = '(#'+seqno+')'
            msg.on('body',async function(stream,info){
                let filePath = path.join(__dirname,'..',...fileLocations)
                await ensurePathExists(filePath)
                const fileExtension = path.extname(filename).toLowerCase()

                if(allowedFileTypes.includes(fileExtension)){
                    const writeStream = fs.createWriteStream(
                        path.join(filename,`${timeStamp}_${filename}`)
                    )

                    writeStream.on('finish',()=>{})

                    if(writeStream.writable){
                        if(encoding.toLowerCase() === 'base64'){
                            stream.pipe(new Base64Decode()).pipe(writeStream)
                        }else{
                            stream.pipe(writeStream)
                        }
                    }

                    emailData.attachments = emailData.attachments ?? [];
                    emailData.attachments.push({
                        name:`${timeStamp}_${filename}`,
                        encoding
                    })

                    msg.once('end',()=>{})
                }

            })
        }
    }

    imap.once('ready', function () {
        imap.openBox('INBOX', false, async function (err, box) {
          if (err) throw err;
          let emailData = {};
          imap.search(['UNSEEN'], function (err, results) {
            if (err) throw err;
            if (results.length === 0) {
              return resolve(emailInfo);
              
            }
            var f = imap.fetch(results, {
              bodies: [''],
              struct: true,
              markSeen: true
            });
            f.on('message', function (msg, seqno) {
              const prefix = '(#' + seqno + ') ';
              msg.on('body', function (stream, info) {
                var buffer = '';
                stream.on('data', function (chunk) {
                  buffer += chunk.toString('utf8');
                });
                console.log('buffer is ',buffer);
                stream.once('end', async function () {
                  emailData = {
                    id: seqno,
                    from: Imap.parseHeader(buffer).from,
                    subject: Imap.parseHeader(buffer).subject,
                    body: buffer,
                    unsupported: false,
                  };
                });
              });
              msg.once('attributes', function (attrs) {
                emailData.id = `${attrs.uid}_${READ_MAIL_CONFIG.imap.user}`;
                const attachments = findAttachmentParts(attrs.struct);
                console.log('result from findAttachmentParts', attachments);
                console.log(prefix + 'Has attachments: %d', attachments.length);
                for (var i = 0, len = attachments.length; i < len; ++i) {
                  const attachment = attachments[i];
                  console.log(prefix + 'Fetching attachment %s', attachment.params.name);
                  var f = imap.fetch(attrs.uid, {
                    bodies: [attachment.partID],
                    struct: true,
                    markSeen: true
                  });
                  f.on('message', buildAttMessageFunction(attachment, emailData));
                }
              });
              msg.once('end', function () {
                console.log(prefix + 'Finished email');
  
                emailInfo.push(emailData);
              });
            });
            f.once('error', function (err) {
              console.log('Fetch error: ' + err);
            });
            f.once('end', function () {
              console.log('Done fetching all messages!');
              imap.end();
            });
          });
        });
      });
  
      imap.once('error', function (err) {
        console.log(err);
      });
  
      imap.once('end', function () {
        console.log('Connection ended');
        resolve(emailInfo);
      });
  
      imap.connect();

} 
