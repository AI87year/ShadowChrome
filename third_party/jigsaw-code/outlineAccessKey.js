/**
 * @license
 * Copyright 2024 The Outline Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This module is adapted from the Outline client implementation at
 * https://github.com/Jigsaw-Code/outline-client/blob/master/client/web/app/outline_server_repository/config.ts
 * and exposes a small JavaScript interface that mirrors the TypeScript
 * source. Minor changes were made to remove dependencies on the Outline
 * method channel and to interoperate with the ShadowChrome runtime.
 */

export const ServiceConfigType = Object.freeze({
  STATIC: 'static',
  DYNAMIC: 'dynamic'
});

export class StaticServiceConfig {
  constructor(name, accessUrl) {
    this.type = ServiceConfigType.STATIC;
    this.name = name || null;
    this.accessUrl = accessUrl;
  }
}

export class DynamicServiceConfig {
  constructor(name, transportConfigLocation) {
    this.type = ServiceConfigType.DYNAMIC;
    this.name = name || null;
    this.transportConfigLocation = transportConfigLocation;
  }
}

function serviceNameFromAccessKey(accessKey) {
  if (!accessKey.hash) {
    return undefined;
  }
  return decodeURIComponent(
    accessKey.hash
      .slice(1)
      .split('&')
      .find(keyValuePair => !keyValuePair.includes('=')) || ''
  ) || undefined;
}

function normaliseUrl(accessKeyUrl) {
  const noHashAccessKey = new URL(accessKeyUrl);
  noHashAccessKey.hash = '';
  return noHashAccessKey;
}

export function parseAccessKey(accessKeyText) {
  if (!accessKeyText) {
    throw new TypeError('Access key is empty');
  }
  let accessKeyUrl;
  try {
    accessKeyUrl = new URL(accessKeyText.trim());
  } catch (error) {
    const err = new Error('Invalid static access key.');
    err.cause = error;
    throw err;
  }

  const name = serviceNameFromAccessKey(accessKeyUrl);
  const noHashAccessKey = normaliseUrl(accessKeyUrl);

  if (noHashAccessKey.protocol === 'ss:') {
    return new StaticServiceConfig(name, noHashAccessKey.toString());
  }

  if (noHashAccessKey.protocol === 'ssconf:' || noHashAccessKey.protocol === 'https:') {
    let configLocation;
    try {
      configLocation = new URL(
        noHashAccessKey.toString().replace(/^ssconf:\/\//, 'https://')
      );
    } catch (error) {
      const err = new Error('Invalid Outline manager URL.');
      err.cause = error;
      throw err;
    }
    return new DynamicServiceConfig(name, configLocation);
  }

  throw new TypeError('Access Key is not a ss:// or ssconf:// URL');
}
