import { connect, write, md5PasswdHash } from './utils.js';

const apiCommand = (cmd: string, params = {}) => ({ cmd, ...params });

type Status = 'S' | 'E';
type Code =
  | 14 // invalid API command or data
  | 23 // invalid json message
  | 45 // permission denied
  | 131 // command OK
  | 132 // command error
  | 134 // get token message okay
  | 135 // check token error
  | 136 // token over max times
  | 137; // base64 decode error

type WhatsminerResponse<Msg> = {
  STATUS: Status;
  When: number;
  Code: Code;
  Msg: Msg;
  Description: string;
};

type TokenMsg = {
  time: string;
  salt: string;
  newsalt: string;
};

type PSUMsg = {
  name: string;
  hw_version: string;
  sw_version: string;
  model: string;
  inn: string;
  vin: string;
  fan_speed: string;
  version: string;
  serial_no: string;
  vendor: string;
};

type VersionMsg = {
  api_ver: string;
  fw_ver: string;
};

type StatusMsg = {
  btmineroff: string;
  'Firmware Version': string;
};

type MinerInfoParams = { info: string } & ConnectionParams;

type MinerInfoMsg = {
  ip?: string;
  proto?: string;
  netmask?: string;
  gateway?: string;
  dns?: string;
  hostname?: string;
  mac?: string;
  ledstat?: string;
};

type ErrorCodeMsg = {
  error_code: string[];
};

type ConnectionParams = {
  host: string;
  port: number;
  passwd?: string;
};

type PoolParams = {
  pool1?: string;
  worker1?: string;
  passwd1?: string;
  pool2?: string;
  worker2?: string;
  passwd2?: string;
  pool3?: string;
  worker3?: string;
  passwd3?: string;
} & Required<ConnectionParams>;

type PowerOffParams = {
  respbefore: 'true' | 'false';
} & Required<ConnectionParams>;

type PowerOnParams = {
  respbefore: 'true' | 'false';
} & Required<ConnectionParams>;

type LEDParams =
  | ({
      param: 'auto';
    } & Required<ConnectionParams>)
  | ({
      color: 'red' | 'green';
      period: number;
      duration: number;
      start: number;
    } & Required<ConnectionParams>);

type PasswdParams = {
  old: string;
  new: string;
} & Required<ConnectionParams>;

type NetConfigParams =
  | ({
      param: 'dhcp';
    } & Required<ConnectionParams>)
  | ({
      ip: string;
      mask: string;
      gate: string;
      dns: string;
      host: string;
    } & Required<ConnectionParams>);

type FrequencyParams = {
  percent: string; // range -100 ~ 100
} & Required<ConnectionParams>;

type HostnameParams = {
  hostname: string;
} & Required<ConnectionParams>;

type ZoneParams = {
  timezone: string;
  zonename: string;
} & Required<ConnectionParams>;

type LogParams = {
  ip: string;
  port: string;
  proto: string;
} & Required<ConnectionParams>;

type PowerPercentParams = {
  percent: string; // range 0 ~ 100
} & Required<ConnectionParams>;

type PrePowerOnParams = {
  complete: 'true' | 'false';
  msg: 'wait for adjust temp' | 'adjust complete' | 'adjust continue';
} & Required<ConnectionParams>;

export const summary = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<object>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('summary'));
};

export const pools = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<object>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('pools'));
};

export const edevs = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<object>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('edevs'));
};

export const devdetails = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<object>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('devdetails'));
};

export const getPSU = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<PSUMsg>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('get_psu'));
};

export const getVersion = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<VersionMsg>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('get_version'));
};

export const getToken = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<TokenMsg>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('get_token'));
};

export const status = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<StatusMsg>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('status'));
};

export const getMinerInfo = async ({
  host,
  port,
  info = 'ip,proto,netmask,gateway,dns,hostname,mac,ledstat',
}: MinerInfoParams): Promise<WhatsminerResponse<MinerInfoMsg>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('get_miner_info', { info }));
};

export const getErrorCode = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerResponse<ErrorCodeMsg>> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('get_error_code'));
};

export const updatePools = async ({
  host,
  port,
  passwd,
  ...params
}: PoolParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('update_pools', { token: sign, ...params }),
    key,
  );
};

export const restartBtminer = async ({
  host,
  port,
  passwd,
  ...params
}: Required<ConnectionParams>): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('restart_btminer', { token: sign, ...params }),
    key,
  );
};

export const powerOff = async ({
  host,
  port,
  passwd,
  ...params
}: PowerOffParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('power_off', { token: sign, ...params }),
    key,
  );
};

export const powerOn = async ({
  host,
  port,
  passwd,
  ...params
}: PowerOnParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(client, apiCommand('power_on', { token: sign, ...params }), key);
};

export const setLED = async ({
  host,
  port,
  passwd,
  ...params
}: LEDParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(client, apiCommand('set_led', { token: sign, ...params }), key);
};

export const powerMode = async ({
  host,
  port,
  passwd,
  ...params
}: Required<ConnectionParams>): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('set_low_power', { token: sign, ...params }),
    key,
  );
};

// TODO: support updating firmware
// export const updateFirmware = async ({ host, port, passwd, ...params }: ConnectionParams) => {

//   const { Msg: { time, salt, newsalt } } = await getToken({ host, port });

//   const key = await md5PasswdHash({ salt, passwd });
//   const sign = await md5PasswdHash({ salt: newsalt, passwd:  key + time });

//   const client = await connect({ host, port });

//   const { enc } = await write(client, {
//     enc: 1,
//     data: cipherAes256(apiCommand('set_low_power', { token: sign, ...params }), key).toString('base64'),
//   });

//   return JSON.parse(decipherAes256(enc, key));
// }

export const reboot = async ({
  host,
  port,
  passwd,
  ...params
}: Required<ConnectionParams>): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(client, apiCommand('reboot', { token: sign, ...params }), key);
};

export const factoryReset = async ({
  host,
  port,
  passwd,
  ...params
}: Required<ConnectionParams>): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('factory_reset', { token: sign, ...params }),
    key,
  );
};

export const updatePassword = async ({
  host,
  port,
  passwd,
  ...params
}: PasswdParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('update_pwd', { token: sign, ...params }),
    key,
  );
};

export const netConfig = async ({
  host,
  port,
  passwd,
  ...params
}: NetConfigParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('net_config', { token: sign, ...params }),
    key,
  );
};

// TODO: support downloading logs
// export const downloadLogs = async ({ host, port, passwd, ...params }: ConnectionParams) => {
//   const {
//     Msg: { time, salt, newsalt },
//   } = await getToken({ host, port });

//   const key = await md5PasswdHash({ salt, passwd });
//   const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });

//   const client = await connect({ host, port });

//   const { enc, file } = await fetchLog(client, {
//     enc: 1,
//     data: cipherAes256(
//       apiCommand('download_logs', { token: sign, ...params }),
//       key,
//     ).toString('base64'),
//   });

//   return {
//     resp: JSON.parse(decipherAes256(enc, key)),
//     file,
//   };
// };

export const setTargetFrequency = async ({
  host,
  port,
  passwd,
  ...params
}: FrequencyParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('set_target_freq', { token: sign, ...params }),
    key,
  );
};

export const enableFastboot = async ({
  host,
  port,
  passwd,
  ...params
}: Required<ConnectionParams>): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('enable_btminer_fast_boot', { token: sign, ...params }),
    key,
  );
};

export const disableFastboot = async ({
  host,
  port,
  passwd,
  ...params
}: Required<ConnectionParams>): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('disable_btminer_fast_boot', { token: sign, ...params }),
    key,
  );
};

export const enableWebpools = async ({
  host,
  port,
  passwd,
  ...params
}: Required<ConnectionParams>): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('enable_web_pools', { token: sign, ...params }),
    key,
  );
};

export const disableWebpools = async ({
  host,
  port,
  passwd,
  ...params
}: Required<ConnectionParams>): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('disable_web_pools', { token: sign, ...params }),
    key,
  );
};

export const setHostname = async ({
  host,
  port,
  passwd,
  ...params
}: HostnameParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('set_hostname', { token: sign, ...params }),
    key,
  );
};

export const setZone = async ({
  host,
  port,
  passwd,
  ...params
}: ZoneParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(client, apiCommand('set_zone', { token: sign, ...params }), key);
};

export const loadLog = async ({
  host,
  port,
  passwd,
  ...params
}: LogParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(client, apiCommand('load_log', { token: sign, ...params }), key);
};

export const setPowerPct = async ({
  host,
  port,
  passwd,
  ...params
}: PowerPercentParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('set_power_pct', { token: sign, ...params }),
    key,
  );
};

export const prePowerOn = async ({
  host,
  port,
  passwd,
  ...params
}: PrePowerOnParams): Promise<WhatsminerResponse<object>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });

  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });
  const client = await connect({ host, port });

  return write(
    client,
    apiCommand('pre_power_on', { token: sign, ...params }),
    key,
  );
};
