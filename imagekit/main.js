require('dotenv').config();

const ImageKit = require('imagekit');
const fs = require('fs');
const path = require('path');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const uploadLogPath = 'log.txt'; // Ensure this path is correct and accessible
const allowedExtensions = ['.jpg', '.png', '.jpeg'];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Modified to log the relative file path
function logUploadedFile(relativeFilePath) {
  fs.appendFileSync(uploadLogPath, relativeFilePath + '\n');
}

// Log errors in a file
function logUploadError(relativeFilePath, error) {
  const errorMessage = `${new Date().toISOString()} - Error uploading ${relativeFilePath}: ${error}\n`;
  fs.appendFileSync('errors.txt', errorMessage);
}


// Updated to check for the relative file path
function hasBeenUploaded(relativeFilePath) {
  const uploadedFiles = fs.readFileSync(uploadLogPath, 'utf8');
  return uploadedFiles.includes(relativeFilePath);
}

async function uploadFile(filePath, imagekitFolderPath, fileName, retries = 3) {
  const relativeFilePath = path.join(imagekitFolderPath, fileName); // Construct the relative file path

  if (hasBeenUploaded(relativeFilePath)) {
    console.log('Skipping already uploaded file:', relativeFilePath);
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
    console.log('Uploaded:', relativeFilePath);
    logUploadedFile(relativeFilePath); // Log the relative file path
  } catch (error) {
    console.error('Upload error:', relativeFilePath, '; Error:', error.message);
    if (retries > 0) {
      console.log(`Retrying... Attempts left: ${retries}`);
      await delay(1000); // Delay of 1 second between retries
      await uploadFile(filePath, imagekitFolderPath, fileName, retries - 1);
    }
    else {
      console.error('Upload error after all retries:', relativeFilePath, '; Error:', error.message);
      logUploadError(relativeFilePath, error.message);
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
      const fileExtension = path.extname(file.name).toLowerCase();

      if (file.isDirectory()) {
        uploadDirectory(filePath, path.join(imagekitFolderPath, file.name));
      } else if (allowedExtensions.includes(fileExtension)) {
        await uploadFile(filePath, imagekitFolderPath, file.name);
      } else {
        console.log('Skipping file due to unsupported extension:', file.name);
      }
    }
  });
}

// Adjust the paths as needed
uploadDirectory('../../roobottom-2022/source/assets/images/diary/', 'assets/images/diary');
