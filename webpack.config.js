const path = require("path");
const loader = require("ts-loader/dist");
module.exports = {
  entry: "./src/shadowMapping.ts",
  devtool: "eval-source-map",
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
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  watch: true,
  output: {
    filename: "bundle.js", 
    path: path.resolve(__dirname, "dist"), // path need to be absolute path not relativce path so we are using path module
  },
  resolve: {
    extensions: [".ts"],
  },
};
