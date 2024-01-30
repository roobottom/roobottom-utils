require('dotenv').config();

const ImageKit = require('imagekit');
const fs = require('fs');
const path = require('path');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const uploadLogPath = 'log.txt'; // Set the path for your upload log

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logUploadedFile(fileName) {
  fs.appendFileSync(uploadLogPath, fileName + '\n');
}

function hasBeenUploaded(fileName) {
  const uploadedFiles = fs.readFileSync(uploadLogPath, 'utf8');
  return uploadedFiles.includes(fileName);
}

async function uploadFile(filePath, imagekitFolderPath, fileName, retries = 3) {
  if (hasBeenUploaded(fileName)) {
    console.log('Skipping already uploaded file:', fileName);
    return;
  }

  try {
    const data = fs.readFileSync(filePath);
    await imagekit.upload({
      file: data,
      fileName: fileName,
      folder: imagekitFolderPath,
      useUniqueFileName: false
    });
    console.log('Uploaded:', fileName);
    logUploadedFile(fileName);
  } catch (error) {
    console.error('Upload error:', fileName, '; Error:', error.message);
    if (retries > 0) {
      console.log(`Retrying... Attempts left: ${retries}`);
      await delay(1000); // Delay of 1 second between retries
      await uploadFile(filePath, imagekitFolderPath, fileName, retries - 1);
    }
  }
}

function uploadDirectory(directoryPath, imagekitFolderPath) {
  fs.readdir(directoryPath, { withFileTypes: true }, async (err, files) => {
    if (err) {
      console.log('Error reading directory:', err);
      return;
    }

    for (const file of files) {
      const filePath = path.join(directoryPath, file.name);

      if (file.isDirectory()) {
        uploadDirectory(filePath, imagekitFolderPath + '/' + file.name);
      } else {
        await uploadFile(filePath, imagekitFolderPath, file.name);
      }
    }
  });
}

uploadDirectory('../../roobottom-2022/source/assets/images/diary/', '/assets/images/diary');
