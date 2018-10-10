const zlib = require("zlib");
const cors = require('connect-cors');
const proxyMiddleware = require('http-proxy-middleware');

const DevOptions = require('./DevOptions');
const devOptions = new DevOptions(process.cwd());

String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};


function HCDev() {

  if (!(this instanceof HCDev)) {
    return new HCDev(config);
  }

  this.config = devOptions.config;

  this.CleanResponseBody = (req, body) => {
    let finalBody = body;
    this.config.urls.forEach((currentHost) => {
      // console.log( "Cleaning content... [" + host + "," + finalBody.length + "]" );
      let remoteHostRegex = new RegExp(currentHost.host, "g");
      let remoteHostWithProtocolRegex = new RegExp(currentHost.protocol + currentHost.host, "g");
      let atgHostRegex = new RegExp("atg_host: \"" + currentHost.host + "\"");
      finalBody = finalBody.replace(remoteHostWithProtocolRegex, "http://localhost:" + this.config.port);
      finalBody = finalBody.replace(atgHostRegex, "atg_host: \"localhost:" + this.config.port + "\"");
      finalBody = finalBody.replace(/atg_port: \"443\"/g, "atg_port: \"" + this.config.port + "\"");
      finalBody = finalBody.replace(/atg_port_secure: \"true\"/g, "atg_port_secure: \"false\"");
      finalBody = finalBody.replace(remoteHostRegex, "localhost:" + this.config.port);

      // Custom Scripts To Inject
      finalBody = this.injectCustomScripts(req, currentHost.protocol, currentHost.host, finalBody);

      // Custom Clean Response Body
      if (this.config.customCleanResponseBody != undefined) {
        finalBody = this.config.customCleanResponseBody(this.config, req, currentHost.protocol, currentHost.host, finalBody);
      }

      // console.log( "Content cleaned... [" + finalBody.length + "]" );
    });

    return finalBody;
  }

  this.injectCustomScripts = (req, protocol, host, finalBody) => {

    // Loop thru custom scripts
    this.config.scriptsToInject.forEach((script) => {
      if ((script.pattern != undefined && script.pattern.test(req.url)) || (script.matchRoutine != undefined && script.matchRoutine(this.config, req, protocol, host, finalBody))) {

        // Perform gallery page injection
        let insertionLocation = finalBody.lastIndexOf('</body>');
        let injectionHTML = '<script type="text/javascript" src="' + script.path + '"' + (script.loadAsync ? ' async' : '') + '></script>';

        // Insert before closing head if specified
        if (script.loadInHead) {
          insertionLocation = finalBody.lastIndexOf('</head>') > -1 ? finalBody.lastIndexOf('</head>') : insertionLocation;
        }

        // Perform insertion
        finalBody = finalBody.insert(insertionLocation, injectionHTML);
      }
    });

    return finalBody;
  }

  this.CheckAdditionalMatchPatterns = (url) => {
    let result = false;
    this.config.matchPatterns.forEach((pattern) => {
      if (url.match(pattern) && !result) {
        result = true;
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

  this.GetServerRoutes = () => {
    let result = {};

    // localRoutes
    for (let iDirs = 0; iDirs < this.config.localRoutes.length; iDirs++) {
      const element = this.config.localRoutes[iDirs];
      result[element.route] = element.dir;
    }

    // Routes for scripts to inject
    this.config.scriptsToInject.forEach((script) => {
      if (script.customRoute != undefined) {
        let keyName = Object.keys(script.customRoute);
        result[keyName] = script.customRoute[keyName];
      }
    });

    return result;
  }

  this.GetMiddlewareRoutes = () => {
    let result = {};

    // remoteRoutes
    for (let iDirs = 0; iDirs < this.config.remoteRoutes.length; iDirs++) {
      const element = this.config.remoteRoutes[iDirs];
      result[element.route] = element.url;
    }

    // Routes for scripts to inject
    this.config.scriptsToInject.forEach((script) => {
      if (script.customRoute != undefined) {
        let keyName = Object.keys(script.customRoute);
        result[keyName] = script.customRoute[keyName];
      }
    });

    return result;
  }

  this.GetHttpProxyMiddlewareConfig = () => {

    let response = {};

    // Target
    response.target = this.config.urls[0].protocol + this.config.urls[0].host;

    // Proxy Agent Config
    response.agent = this.config.agent ? this.config.agent : null;

    // Secure connection
    response.secure = this.config.validateCerts ? this.config.validateCerts : true;

    // Header configuration
    response.headers = {
      host: this.config.urls[0].host
    };

    // Change Origin
    response.changeOrigin = this.config.changeOrigin ? this.config.changeOrigin : true;

    // Auto Rewrite
    response.autoRewrite = this.config.autoRewrite ? this.config.autoRewrite : true;

    // Remote Routes
    response.router = this.GetMiddlewareRoutes();

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
          cors(this.config.corsOptions ? this.config.corsOptions : {})
        ],
        routes: this.GetServerRoutes()
      }
    };
  }

};

module.exports = HCDev;
