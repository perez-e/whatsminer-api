import net from 'node:net';
import crypto from 'node:crypto';
import { exec as originalExec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const formatDateTime = (dateTime: Date) => {
  const year = dateTime.getFullYear();
  const month = String(dateTime.getMonth() + 1).padStart(2, '0');
  const day = String(dateTime.getDate()).padStart(2, '0');
  const hour = String(dateTime.getHours()).padStart(2, '0');
  const minute = String(dateTime.getMinutes()).padStart(2, '0');
  const seconds = String(dateTime.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${seconds}`;
};

export const connect = ({
  host,
  port,
}: {
  host: string;
  port: number;
}): Promise<net.Socket> =>
  new Promise((resolve, _reject) => {
    const client: net.Socket = net.connect({ host, port }, () =>
      resolve(client),
    );
  });

const _write = <T>(client: net.Socket, msg: object): Promise<T> =>
  new Promise((resolve, _reject) => {
    let result = '';
    client.on('data', (data) => {
      result += data.toString();
    });
    client.on('end', () => {
      resolve(JSON.parse(result));
    });
    client.write(JSON.stringify(msg));
  });

export const write = async <T>(
  client: net.Socket,
  msg: object,
  key?: string,
): Promise<T> => {
  if (key !== undefined) {
    const cipherApiCmd: string = cipherAes256(msg, key).toString('base64');
    const { enc } = await _write(client, { enc: 1, data: cipherApiCmd });
    return JSON.parse(decipherAes256(enc, key));
  } else {
    return _write(client, msg);
  }
};

export const fetchLogs = async <T>(
  client: net.Socket,
  msg: object,
  key: string,
  output?: string,
): Promise<T> => {
  const apiCmd = { enc: 1, data: cipherAes256(msg, key).toString('base64') };
  const filename = output
    ? `${output}.tar.gz`
    : `${formatDateTime(new Date())}.tar.gz`;
  const file = fs.createWriteStream(filename);
  let response: T;

  return new Promise((resolve, _reject) => {
    client.once('data', (data) => {
      const { enc } = JSON.parse(data.toString());
      response = JSON.parse(decipherAes256(enc, key));
      client.pipe(file);
    });

    client.on('end', () => {
      file.close();
      resolve(response);
    });

    client.write(JSON.stringify(apiCmd));
  });
};

const exec = promisify(originalExec);

const sha256 = (x: string) =>
  crypto.createHash('sha256').update(Buffer.from(x)).digest();

const pad16Buff = (apiCmd: string) =>
  Buffer.from(apiCmd + Buffer.alloc(16 - (apiCmd.length % 16), '\0'));

export const md5PasswdHash = async ({
  salt,
  passwd,
}: {
  salt: string;
  passwd: string;
}) => {
  const { stdout } = await exec(
    `openssl passwd -1 -salt ${salt} ${passwd} | cut -f 4 -d '$'`,
  );
  return stdout.trim();
};

const cipherAes256 = (apiCmd: object, key: string) => {
  const aeskey = sha256(key);
  const apiBuff = pad16Buff(JSON.stringify(apiCmd));
  const cipher = crypto.createCipheriv('aes-256-ecb', aeskey, null);
  cipher.setAutoPadding(false);

  return Buffer.concat([cipher.update(apiBuff), cipher.final()]);
};

const decipherAes256 = (enc: string, key: string) => {
  const aeskey = sha256(key);
  const cipherBuff = Buffer.from(enc, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-ecb', aeskey, null);
  decipher.setAutoPadding(false);

  return Buffer.concat([decipher.update(cipherBuff), decipher.final()])
    .toString()
    .split('\0')[0];
};
