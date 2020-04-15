# 七牛云自动打包上传webpack插件

#### 介绍
前端项目build后自动上传到七牛云


#### 使用说明

1.  npm install qiudistupload -D
2.  写入配置
```
module.exports = {
    ...,
    configureWebpack: config => {
        if (process.env.NODE_ENV === 'production') {
            config.plugins.push(new QiNiuUploadPlug({
                  publicPath: 'https://xxxxx', // 七牛云域名，和文件夹名称一起，自动替换默认设置的 publicPath
                  prefix, // 文件夹名称，默认 webDist
                  accessKey: 'xxxx', // 个人中心，秘钥管理，AK
                  secretKey: 'xxxx', // 个人中心，秘钥管理，SK
                  bucket: 'xxx', // 存储空间名称
                  zone: 'xxx', // 存储地区
                  cover: true, // 默认为 false, 慎用！设置为 true 会覆盖掉已经保存在七牛云上的同名文件。
                  clear: false, // 默认为 false 慎用！上传前是否清空文件夹里已上传的文件 
            }))
        }
    }
}
```

#### 也可以自己改造适合自己的

1. 把lib目录下的文件拷出来，放在项目根目录，然后在webpack里引入，用法如上
2. 如果是vue-cli构建的项目，直接在vue.config.js里引入，用法还是如上

### Tips
插件基于webpack 4.x，node 8以上的，这里注意下

#### 码云特技

1.  使用 Readme\_XXX.md 来支持不同的语言，例如 Readme\_en.md, Readme\_zh.md
2.  你可以 [https://gitee.com/explore](https://gitee.com/explore) 这个地址来了解码云上的优秀开源项目
3.  [GVP](https://gitee.com/gvp) 全称是码云最有价值开源项目，是码云综合评定出的优秀开源项目
