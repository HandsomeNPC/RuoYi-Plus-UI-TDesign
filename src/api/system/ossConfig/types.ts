export interface OssConfigVO extends BaseEntity {
  ossConfigId: string | number;
  configKey: string;
  accessType: string;
  bucketName: string;
  accessDomain: string;
  accessPolicy: string;
  region: string;
  status: string;
  isPrimary: string;
  isHttps: string;
  domain: string;
  remark?: string;
}

export interface OssConfigForm {
  ossConfigId?: string | number;
  configKey?: string;
  accessType?: string;
  bucketName?: string;
  accessDomain?: string;
  accessPolicy?: string;
  region?: string;
  status?: string;
  isPrimary?: string;
  isHttps?: string;
  domain?: string;
  remark?: string;
  accessKey?: string;
  secretKey?: string;
}

export interface OssConfigQuery extends PageQuery {
  configKey?: string;
  bucketName?: string;
  status?: string;
}
