const { app, BrowserWindow, Menu } = require('electron');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
const AWS = require('aws-sdk');
const aws4 = require('aws4');

const bucketname = 'bhavanish1';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-south-1',
});
log.info('AWS.config.update.accessKeyId: ', process.env.AWS_ACCESS_KEY_ID);
log.info('AWS.config.update.secretAccessKeyId: ', process.env.AWS_SECRET_ACCESS_KEY);

const s3 = new AWS.S3();

function listS3Objects() {
  const params = {
    Bucket: bucketname,
    Prefix: 'etime/desktop',
  };

  s3.listObjects(params, (err, data) => {
    if (err) {
      log.error('Error listing objects:', err);
    } else {
      console.log('Objects in the S3 bucket:');
      for (const obj of data.Contents) {
        log.info(obj.Key);
      }
    }
  });
}
listS3Objects();


autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

let template = [];
if (process.platform === 'darwin') {
  const name = app.getName();
  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        role: 'about',
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click() {
          app.quit();
        },
      },
    ],
  });
}

let win;

function sendStatusToWindow(text) {
  log.info(text);
  win.webContents.send('message', text);
}

function createDefaultWindow() {
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.webContents.openDevTools();
  win.on('closed', () => {
    win = null;
  });
  win.loadURL(`file://${__dirname}/version.html#v${app.getVersion()}`);
  return win;
}

autoUpdater.on('checking-for-update', async () => {
  let opts = {
    region: 'ap-south-1',
    protocol: 'https:',
    method: 'get',
    hostname: 'bhavanish1.s3.amazonaws.com',
    path: '/etime/desktop/latest.yml',
    host: 's3-ap-south-1.amazonaws.com',
  };

  await aws4.sign(opts, {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  autoUpdater.requestHeaders = opts.headers;
});

autoUpdater.on('update-available', (info) => {
  // Handle update availability here
  sendStatusToWindow('Update available.');

  // Define your release path variable elsewhere
  let update_path = '/etime/desktop/latest.yml';
  let opts = {
    service: 's3',
    region: 'ap-south-1', // Use the correct region for your S3 bucket
    method: 'GET',
    host: 'bhavanish1.s3.amazonaws.com', // Use your bucket name
    path: update_path,
  };
  aws4.sign(opts, {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
  autoUpdater.requestHeaders = opts.headers;

  // Start downloading the update
  autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('Update not available.');
});

autoUpdater.on('error', (err) => {
  sendStatusToWindow('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
  sendStatusToWindow(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('Update downloaded');
});

app.on('ready', function () {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  createDefaultWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (win === null) {
    createDefaultWindow();
  }
});

// Auto updates - Option 1 - Simplest version
app.on('ready', function () {
  autoUpdater.checkForUpdatesAndNotify();
});
