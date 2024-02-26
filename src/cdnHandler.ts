import https from 'https';
import fs from 'fs';

const REGION = ''; // If German region, set this to an empty string: ''
const BASE_HOSTNAME = 'storage.bunnycdn.com';
const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
const STORAGE_ZONE_NAME = 'YOUR_STORAGE_ZONE_NAME';
const FILENAME_TO_UPLOAD = 'filenameyouwishtouse.txt';
const FILE_PATH = '/path/to/your/file/upload.txt';
const ACCESS_KEY = 'YOUR_BUNNY_STORAGE_API_KEY';

const uploadFile = async () => {
  const readStream = fs.createReadStream(FILE_PATH);

  const options = {
    method: 'PUT',
    host: HOSTNAME,
    path: `/${STORAGE_ZONE_NAME}/${FILENAME_TO_UPLOAD}`,
    headers: {
      AccessKey: ACCESS_KEY,
      'Content-Type': 'application/octet-stream',
    },
  };

  const req = https.request(options, (res) => {
    res.on('data', (chunk) => {
      console.log(chunk.toString('utf8'));
    });
  });

  req.on('error', (error) => {
    console.error(error);
  });

  readStream.pipe(req);
};

const main = async () => {
  await uploadFile();
};

main();


const options = {method: 'DELETE'};

fetch('https://storage.bunnycdn.com/storageZoneName/path/fileName', options)
  .then(response => response.json())
  .then(response => console.log(response))
  .catch(err => console.error(err));
