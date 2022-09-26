const path = require("path");
const loader = require("ts-loader/dist");
module.exports = {
  entry: "./src/shadowMapping.ts",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        include: [path.resolve(__dirname, "src")],
      },
      {
        test: /\.wgsl$/,
        use: {
          loader: "ts-shader-loader",
        },
      },
    ],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"), // path need to be absolute path not relativce path so we are using path module
  },
  resolve: {
    extensions: [".ts"],
  },
};
