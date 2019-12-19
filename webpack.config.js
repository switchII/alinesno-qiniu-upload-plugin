const myPlugin = require("./lib/qiuDistUpload");
const path = require("path");
module.exports = {
  entry: "./index.js",
  mode: "production",
  output: {
    filename: "bundle.js"
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/"),
      Utilities: path.resolve(__dirname, "src/utilities/"),
      Templates: path.resolve(__dirname, "src/templates/")
    }
  },
  plugins: [
    new myPlugin({
      clear: false
    })
  ]
};
