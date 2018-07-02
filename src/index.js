const zlib = require("zlib");
const cors = require('connect-cors');
const proxyMiddleware = require('http-proxy-middleware');

const DevOptions = require('./DevOptions');
const devOptions = new DevOptions(process.cwd());


function HCDev() {

  if (!(this instanceof HCDev)) {
    return new HCDev(config);
  }

  this.config = devOptions.config;

  this.AddUrl = (url) => {
    this.config.urls.push(url);
  }

  this.AddLocalRoute = (route,dir) => {
    this.config.localRoutes.push({
      route: route,
      dir: dir
    });
  }

  this.CleanResponseBody = (req, body) => {
    let finalBody = body;
    this.config.urls.forEach((host) => {
      // console.log( "Cleaning content... [" + host + "," + finalBody.length + "]" );
      let remoteHostRegex = new RegExp(host, "g");
      let remoteHostWithProtocolRegex = new RegExp("https://" + host, "g");
      let atgHostRegex = new RegExp("atg_host: \"" + host + "\"");
      finalBody = finalBody.replace(remoteHostWithProtocolRegex, "http://localhost:" + this.config.port);
      finalBody = finalBody.replace(atgHostRegex, "atg_host: \"localhost:" + this.config.port +"\"");
      finalBody = finalBody.replace(/atg_port: \"443\"/g, "atg_port: \"" + this.config.port + "\"");
      finalBody = finalBody.replace(/atg_port_secure: \"true\"/g, "atg_port_secure: \"false\"");
      finalBody = finalBody.replace(remoteHostRegex, "localhost:" + this.config.port);

      if (this.config.customCleanResponseBody != undefined) {
        finalBody = this.config.customCleanResponseBody(this.config, req, host, finalBody);
      }

      // console.log( "Content cleaned... [" + finalBody.length + "]" );
    });

    return finalBody;
  }

  this.CheckAdditionalMatchPatterns = (url) => {
    let result = false;
    this.config.matchPatterns.forEach((pattern) => {
      if(url.match(pattern) && !result){
        result = true;
        break;
      }
    });

    return result;
  }

  this.OnProxyRes = (proxyRes, req, res) => {
    if ((proxyRes.headers &&
        proxyRes.headers["content-type"] &&
        proxyRes.headers["content-type"].match("text/html")) || req.url.match("channelConfig") || this.CheckAdditionalMatchPatterns(req.url)) {
      // console.log("Modifying: " + req.url);
      const thisProxy = this;
      const write = res.write;
      const end = res.end;
      const writeHead = res.writeHead;
      let writeHeadArgs;
      let body;
      let buffer = new Buffer("");

      // Defer write and writeHead
      res.write = () => {};
      res.writeHead = (...args) => {
        writeHeadArgs = args;
      };

      // Concat and unzip proxy response
      proxyRes
        .on("data", (chunk) => {
          buffer = Buffer.concat([buffer, chunk]);
        })
        .on("end", () => {
          if (res.getHeader("content-encoding") === "gzip") {
            console.log("Decompressing gzip...");
            body = zlib.gunzipSync(buffer).toString("utf8");
          } else {
            body = buffer.toString();
          }

          console.log("Sending: " + req.url);
          const output = thisProxy.CleanResponseBody(req, body); // some function to manipulate body

          res.write = write;
          let tmpLocation = res.getHeader("location");
          if (tmpLocation && tmpLocation.indexOf('zscalertwo.net') > -1) {
            thisProxy.config.urls.forEach((currentHost) => {
              let hostWithoutPeriods = currentHost.host.replace(/\./g, "%2e");
              let escapedHost = new RegExp("https%3A%2F%2F" + hostWithoutPeriods, "g");
              tmpLocation = tmpLocation.replace(escapedHost, 'http%3A%2F%2Flocalhost:' + thisProxy.config.port);
              res.setHeader("location", tmpLocation);

              // debugger;
              let tmpCookie = res.getHeader("set-cookie");
              if (tmpCookie) {
                let finalCookie = [];
                tmpCookie.forEach((cookie) => {
                  let escapedHost = new RegExp(currentHost.host, "g");
                  cookie = cookie.replace(escapedHost, 'localhost:' + thisProxy.config.port);
                  finalCookie.push(cookie);
                });
                res.setHeader("set-cookie", finalCookie);
              }

            });
          }

          res.setHeader("content-length", output.length);
          res.setHeader("content-encoding", "");
          res.setHeader("transfer-encoding", "");
          res.setHeader("cache-control", "no-cache");
          // res.setHeader( "access-control-allow-headers" , "" );
          // res.setHeader( "access-control-allow-origin" , "" );
          res.setHeader("x-dev-proxy", "true");

          if (writeHeadArgs === undefined) {
            writeHeadArgs = [200, 'OK']
          }
          writeHead.apply(res, writeHeadArgs);

          try {
            if (output.length) {
              // console.log("Sending modified content...");
              // Write everything via end()
              res.write(output);
            } else {
              // console.log("No modification made, sending standard content.");
            }
          } catch (ex) {
            console.log(ex);
          }
          res.end();
        });
    } else {
      // console.log("Skipping modification, sending: " + req.url);
    }
  }

  this.GetRoutes = () => {
    let result = {};
    for (let iDirs = 0; iDirs < this.config.localRoutes.length; iDirs++) {
      const element = this.config.localRoutes[iDirs];
      result[element.route] = element.dir;
    }

    return result;
  }

  this.GetHttpProxyMiddlewareConfig = () => {

    let response = {};

    // Target
    response.target = this.config.urls[0].protocol + this.config.urls[0].host;

    // Proxy Agent Config
    response.agent = this.config.agent ? this.config.agent : null;

    // Secure connection
    response.secure = true;

    // Header configuration
    response.headers = {
        host: this.config.urls[0].host
    };

    // Change Origin
    response.changeOrigin = true;

    // Auto Rewrite
    response.autoRewrite = true;

    // Proxy processing object
    response.onProxyRes = this.OnProxyRes;

    return response;
  }

  this.GetBrowserSyncConfig = () => {
    return {
      open: true,
      port: this.config.port,
      host: 'localhost',
      serveStatic: this.config.localRoutes,
      server: {
        secure: false,
        baseDir: './',
        middleware: [
          proxyMiddleware(this.GetHttpProxyMiddlewareConfig()),
          cors({})
        ],
        routes: this.GetRoutes()
      }
    };
  }

};

module.exports = HCDev;
