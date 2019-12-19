'use strict';

const qiniu = require('qiniu');
const path = require('path');
const ora = require('ora');

// 上传文件到七牛云
/**
 * qiniu upload
 *
 * @param {qiniuConfig} defaultConfig The default config for the instance
 * @return {QiuDistUpload} A new instance of QiuDistUpload
 */
class QiuDistUpload {
  constructor(qiniuConfig) {
    if (
      !qiniuConfig ||
      !qiniuConfig.publicPath ||
      !qiniuConfig.accessKey ||
      !qiniuConfig.secretKey ||
      !qiniuConfig.bucket ||
      !qiniuConfig.zone
    ) {
      throw new Error('参数没有传递完全！');
    }
    // 保存用户传参
    this.qiniuConfig = qiniuConfig;

    // 资源前缀，除了publicPath，这里也可以区分资源是哪个目录下的
    this.prefix = qiniuConfig.prefix || 'webDist';

    // 上传前是否清空前缀下的文件
    this.isClear = qiniuConfig.clear && true;

    // 创建的七牛认证信息
    this.qiniuAuthenticationConfig = {};

    // 鉴权
    this.qiniuAuthenticationConfig.mac = new qiniu.auth.digest.Mac(qiniuConfig.accessKey, qiniuConfig.secretKey);

    // 存储空间名称
    const options = {
      scope: qiniuConfig.bucket
    };

    // 创建上传token
    const putPolicy = new qiniu.rs.PutPolicy(options);
    this.qiniuAuthenticationConfig.uploadToken = putPolicy.uploadToken(this.qiniuAuthenticationConfig.mac);
    const config = new qiniu.conf.Config();

    // 存储空间对应的机房
    config.zone = qiniu.zone[qiniuConfig.zone];
    this.qiniuAuthenticationConfig.formUploader = new qiniu.form_up.FormUploader(config);

    // 构建BucketManager对象
    this.qiniuAuthenticationConfig.bucketManager = new qiniu.rs.BucketManager(this.qiniuAuthenticationConfig.mac, config);
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('QiuDistUpload', compilation => {
      compilation.outputOptions.publicPath = path.join(this.qiniuConfig.publicPath, this.prefix, '/');

      // 获取项目的绝对路径
      this.absolutePath = compilation.outputOptions.path;
    });

    const self = this;
    compiler.hooks.done.tapAsync('QiuDistUpload', (data, callback) => {
      // 先返回构建结果，然后异步上传
      callback();
      if (!self.isClear) {
        self.uploadFiles(data);
        return;
      }

      // 确定删除之前的文件
      self.removeListFromPrefix(() => self.uploadFiles(data));
    });
  }

  uploadFiles(data) {
    const assetsPromise = [];
    const spinner = ora();

    Object.keys(data.compilation.assets).forEach(file => {
      // 上传非html文件
      if (!/.html$/.test(file)) assetsPromise.push(this.uploadFile(file));
    });

    Promise.all(assetsPromise)
      .then(res => spinner.succeed('七牛云上传完毕!'))
      .catch(err => {
      console.error(err);
    });
  }

  uploadFile(filename, coverUploadToken) {
    const key = path.join(this.prefix, filename);
    const localFile = path.join(this.absolutePath || '', filename);
    return new Promise((resolve, reject) => {
      const uploadToken = coverUploadToken
        ? coverUploadToken
        : this.qiniuAuthenticationConfig.uploadToken;
      const putExtra = new qiniu.form_up.PutExtra();
      this.qiniuAuthenticationConfig.formUploader.putFile(
        uploadToken,
        key,
        localFile,
        putExtra,
        (respErr, respBody, respInfo) => {
          if (respErr) {
            throw respErr;
          }
          if (respInfo.statusCode == 200) {
            resolve(respInfo);
            console.info(`文件：${key}，上传成功！`);
          } else {
            if (
              this.qiniuConfig.cover &&
              (respInfo.status === 614 || respInfo.statusCode === 614)
            ) {
              console.warn(`文件：${key}，已存在，尝试覆盖上传！`);
              resolve(this.uploadFile(filename, this.coverUploadFile(filename)));
            } else {
              console.error(`文件：${key}，上传失败！`);
              reject(respInfo);
            }
          }
        }
      );
    });
  }

  coverUploadFile(filename) {
    const options = {
      scope: this.qiniuConfig.bucket + ':' + path.join(this.prefix, filename)
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    return putPolicy.uploadToken(this.qiniuAuthenticationConfig.mac);
  }

  removeListFromPrefix(cb) {
    const bucketManager = this.qiniuAuthenticationConfig.bucketManager;
    const options = { prefix: this.prefix };
    const bucket = this.qiniuConfig.bucket;
    bucketManager.listPrefix(bucket, options, (err, respBody, respInfo) => {
      if (err) {
        console.error(err);
        throw err;
      }
      if (respInfo.statusCode != 200) {
        console.warn(respBody);
        cb && cb();
        return;
      }

      const items = respBody.items;
      const deleteOperations = [];

      items.forEach(item => {
        deleteOperations.push(qiniu.rs.deleteOp(bucket, item.key));
      });

      if (!deleteOperations.length) {
        cb && cb();
        return;
      }

      //每个operations的数量不可以超过1000个，如果总数量超过1000，需要分批发送
      const spinner = ora(`开始删除...`).start();
      bucketManager.batch(deleteOperations, (err1, respBody1, respInfo1) => {
        if (err1) {
          console.error(err1);
          throw err1;
        }

        // statusCode 为 200 全部删除，298 部分删除
        const success = parseInt(respInfo1.statusCode / 100) == 2;
        if (!success) {
          console.warn(respBody1);
          cb && cb();
          spinner.fail(`批量删除失败！`);
          return;
        }
        spinner.succeed(`批量删除成功！`);
        cb && cb();
      });
    });
  }
}

module.exports = QiuDistUpload;
