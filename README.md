# Email Reader Application

Application currently under development

This is a Node.js application that uses the `node-imap` library to read emails from an IMAP server. The application connects to an email account, fetches emails, and performs various operations such as listing emails, fetching email bodies, and handling attachments.

## Prerequisites

Before running the application, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14.x or higher)
- [npm](https://www.npmjs.com/get-npm) (v6.x or higher)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/email-reader.git
   cd email-reader
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the root directory of the project and add the following configuration variables:

```env
IMAP_HOST=imap.your-email-provider.com
IMAP_PORT=993
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
```

## Usage

Run the application with the following command:

```bash
node index.js
```

## Code Overview

### index.js

This is the main entry point of the application. It initializes the IMAP connection and handles email fetching.

```javascript
require('dotenv').config();
const Imap = require('node-imap');
const { inspect } = require('util');

const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: process.env.IMAP_HOST,
  port: process.env.IMAP_PORT,
  tls: true
});

function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    console.log('Total number of messages: ' + box.messages.total);
    const f = imap.seq.fetch('1:5', {
      bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
      struct: true
    });
    f.on('message', function(msg, seqno) {
      console.log('Message #%d', seqno);
      const prefix = '(#' + seqno + ') ';
      msg.on('body', function(stream, info) {
        let buffer = '';
        stream.on('data', function(chunk) {
          buffer += chunk.toString('utf8');
        });
        stream.once('end', function() {
          console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
        });
      });
      msg.once('attributes', function(attrs) {
        console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
      });
      msg.once('end', function() {
        console.log(prefix + 'Finished');
      });
    });
    f.once('error', function(err) {
      console.log('Fetch error: ' + err);
    });
    f.once('end', function() {
      console.log('Done fetching all messages!');
      imap.end();
    });
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();
```

## Dependencies

- `dotenv`: Loads environment variables from a `.env` file into `process.env`.
- `node-imap`: Provides IMAP client functionality for Node.js.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you would like to contribute to this project.

## Acknowledgements

- [node-imap](https://github.com/mscdex/node-imap) for the IMAP client functionality.
- [dotenv](https://github.com/motdotla/dotenv) for managing environment variables.