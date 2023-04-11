import { connect, write, md5PasswdHash, fetchLogs } from './utils.js';

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

type WhatsminerSummaryResponse = {
  STATUS: WhatsminerResponse<string>[];
  SUMMARY: {
    Elapsed: number;
    'MHS av': number; // Average hash rate of miner(MHS)
    'MHS 5s': number;
    'MHS 1m': number;
    'MHS 5m': number;
    'MHS 15m': number;
    'HS RT': number;
    'Found Blocks': number;
    Getworks: number;
    Accepted: number;
    Rejected: number;
    'Hardware Errors': number;
    Utility: number;
    Discarded: number;
    Stale: number;
    'Get Failures': number;
    'Local Work': number;
    'Remote Failures': number;
    'Network Blocks': number;
    'Total MH': number;
    'Work Utility': number;
    'Difficulty Accepted': number;
    'Difficulty Rejected': number;
    'Difficulty Stale': number;
    'Best Share': number;
    Temperature: number;
    freq_avg: number;
    'Fan Speed In': number; // Air inlet Fan speed(RPM)
    'Fan Speed Out': number; // Air outlet fan speed(RPM)
    Voltage: number;
    Power: number; // Input power(W)
    Power_RT: number;
    'Power Rate': number;
    'Device Hardware%': number;
    'Device Rejected%': number;
    'Pool Rejected%': number;
    'Pool Stale%': number;
    'Last getwork': number;
    Uptime: number; // System up time(second)
    'Power Current': number;
    'Power Fanspeed': number;
    'Error Code Count': number;
    'Factory Error Code Count': number;
    'Security Mode': number;
    'Liquid Cooling': boolean;
    'Hash Stable': boolean;
    'Target Freq': number;
    'Target MHS': number;
    'Env Temp': number;
    'Power Mode': string; // Power mode (Low/Normal/High)
    'Firmware Version': string;
    MAC: string;
    'Factory GHS': number; // Factory hash rate(GHS)
    'Power Limit': number;
    'Chip Temp Min': number;
    'Chip Temp Max': number;
    'Chip Temp Avg': number;
    Debug: string;
    'Btminer Fast Boot': string;
  }[];
};

type WhatsminerPoolsResponse = {
  STATUS: WhatsminerResponse<string>[];
  POOLS: {
    POOL: number;
    URL: string;
    Status: string; // Pool status
    Priority: number; // Pool priority(0 highest)
    Quota: number; // Pool default strategy is 1
    'Long Poll': string;
    Getworks: number;
    Accepted: number; // Accepted nonces by the pool
    Rejected: number; // Rejected nonces by the pool
    Works: number;
    Discarded: number;
    Stale: number;
    'Get Failures': number;
    'Remote Failures': number;
    User: string; // Miner name
    'Last Share Time': number; // Last nonce submission time
    'Diff1 Shares': number;
    'Proxy Type': string;
    Proxy: string;
    'Difficulty Accepted': number;
    'Difficulty Rejected': number;
    'Difficulty Stale': number;
    'Last Share Difficulty': number;
    'Work Difficulty': number;
    'Has Stratum': number;
    'Stratum Active': boolean; // Pool stratumstatus
    'Stratum URL': string; // Pool address
    'Stratum Difficulty': number; // Pool dif iculty
    'Has GBT': boolean;
    'Best Share': number;
    'Pool Rejected%': number; // Pool rejection percent
    'Pool Stale%': number;
    'Bad Work': number;
    'Current Block Height': number; // Current Block Height
    'Current Block Version': number; // Current Block Version
  }[];
};

type WhatsminerDevResponse = {
  STATUS: WhatsminerResponse<string>[];
  DEVS: {
    ASC: number;
    Name: string;
    ID: number;
    Slot: number; // Hash board slot number
    Enabled: string;
    Status: string;
    Temperature: number; // Board temperature at air outlet (℃)
    'Chip Frequency': number; // Average frequency of chips in hash board (MHz)
    'Fan Speed In': number;
    'Fan Speed Out': number;
    'MHS av': number; // Average hash rate of hash board (MHS)
    'MHS 5s': number;
    'MHS 1m': number;
    'MHS 5m': number;
    'MHS 15m': number;
    'HS RT': number;
    Accepted: number;
    Rejected: number;
    'Hardware Errors': number;
    Utility: number;
    'Last Share Pool': number;
    'Last Share Time': number;
    'Total MH': number;
    'Diff1 Work': number;
    'Difficulty Accepted': number;
    'Difficulty Rejected': number;
    'Last Share Difficulty': number;
    'Last Valid Work': number;
    'Device Hardware%': number;
    'Device Rejected%': number;
    'Device Elapsed': number;
    'Upfreq Complete': number;
    'Effective Chips': number;
    'PCB SN': string; // PCB serial number
    'Chip Data': string;
    'Chip Temp Min': number;
    'Chip Temp Max': number;
    'Chip Temp Avg': number;
    chip_vol_diff: number;
  }[];
};

type WhatsminerDevdetailResponse = {
  STATUS: WhatsminerResponse<string>[];
  DEVDETAILS: {
    // Hashboard detail
    DEVDETAILS: number;
    Name: string;
    ID: number;
    Driver: string;
    Kernel: string;
    Model: string;
  }[];
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

type DownloadLogsParams = {
  output: string;
} & Required<ConnectionParams>;

type DownloadLogsMsg = {
  logilelen: String;
};

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
}: ConnectionParams): Promise<WhatsminerSummaryResponse> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('summary'));
};

export const pools = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerPoolsResponse> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('pools'));
};

export const edevs = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerDevResponse> => {
  const client = await connect({ host, port });
  return write(client, apiCommand('edevs'));
};

export const devdetails = async ({
  host,
  port,
}: ConnectionParams): Promise<WhatsminerDevdetailResponse> => {
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
}: PoolParams): Promise<WhatsminerResponse<string>> => {
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
}: Required<ConnectionParams>): Promise<WhatsminerResponse<string>> => {
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
}: LEDParams): Promise<WhatsminerResponse<string>> => {
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
}: Required<ConnectionParams>): Promise<WhatsminerResponse<string>> => {
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
}: Required<ConnectionParams>): Promise<WhatsminerResponse<string>> => {
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
}: Required<ConnectionParams>): Promise<WhatsminerResponse<string>> => {
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
}: NetConfigParams): Promise<WhatsminerResponse<string>> => {
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

export const downloadLogs = async ({
  host,
  port,
  passwd,
  output,
  ...params
}: DownloadLogsParams): Promise<WhatsminerResponse<DownloadLogsMsg>> => {
  const {
    Msg: { time, salt, newsalt },
  } = await getToken({ host, port });
  const key = await md5PasswdHash({ salt, passwd });
  const sign = await md5PasswdHash({ salt: newsalt, passwd: key + time });

  const client = await connect({ host, port });

  return fetchLogs(
    client,
    apiCommand('download_logs', { token: sign, ...params }),
    key,
    output,
  );
};

export const setTargetFrequency = async ({
  host,
  port,
  passwd,
  ...params
}: FrequencyParams): Promise<WhatsminerResponse<string>> => {
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
}: Required<ConnectionParams>): Promise<WhatsminerResponse<string>> => {
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
}: Required<ConnectionParams>): Promise<WhatsminerResponse<string>> => {
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
}: Required<ConnectionParams>): Promise<WhatsminerResponse<string>> => {
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
}: Required<ConnectionParams>): Promise<WhatsminerResponse<string>> => {
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
}: HostnameParams): Promise<WhatsminerResponse<string>> => {
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
}: ZoneParams): Promise<WhatsminerResponse<string>> => {
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
}: LogParams): Promise<WhatsminerResponse<string>> => {
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
}: PowerPercentParams): Promise<WhatsminerResponse<string>> => {
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
}: PrePowerOnParams): Promise<WhatsminerResponse<string>> => {
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
