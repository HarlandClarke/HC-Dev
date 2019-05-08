const zlib = require("zlib");
const proxyMiddleware = require('http-proxy-middleware');

String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

function HCDev(tmpConfig) {

  if (!(this instanceof HCDev)) {
    return new HCDev(config);
  }

  this.config = tmpConfig;

  this.CleanResponseBody = (req, body) => {
    let finalBody = body;
    this.config.urls.forEach((currentUrl) => {
      finalBody = this.CleanResponseBodyWithHost(req, body, currentUrl, "localhost", this.config.port);
    });

    return finalBody;
  }

  this.CleanResponseBodyWithHost = (req, body, currentUrl, newHost, newPort, skipInjectionAndCustomCleanup = false) => {
    let finalBody = body;

    // console.log( "Cleaning content... [" + host + "," + finalBody.length + "]" );
    let remoteHostRegex = new RegExp(currentUrl.host, "g");
    let remoteHostWithProtocolRegex = new RegExp(currentUrl.protocol + currentUrl.host, "g");
    let atgHostRegex = new RegExp("atg_host: \"" + currentUrl.host + "\"");
    finalBody = finalBody.replace(remoteHostWithProtocolRegex, "http://" + newHost + ":" + newPort);
    finalBody = finalBody.replace(atgHostRegex, "atg_host: \"" + newHost + ":" + newPort + "\"");
    finalBody = finalBody.replace(/atg_port: \"443\"/g, "atg_port: \"" + newPort + "\"");
    finalBody = finalBody.replace(/atg_port_secure: \"true\"/g, "atg_port_secure: \"false\"");
    finalBody = finalBody.replace(remoteHostRegex, newHost + ":" + newPort);

    if (!skipInjectionAndCustomCleanup) {
      // Custom link To Inject
      finalBody = this.injectCustomLinks(req, currentUrl.protocol, currentUrl.host, finalBody);

      // Custom Scripts To Inject
      finalBody = this.injectCustomScripts(req, currentUrl.protocol, currentUrl.host, finalBody);

      // Custom Clean Response Body
      if (this.config.customCleanResponseBody != undefined) {
        finalBody = this.config.customCleanResponseBody(this.config, req, currentUrl.protocol, currentUrl.host, finalBody, newHost, newPort);
      }
    }

    // console.log( "Content cleaned... [" + finalBody.length + "]" );

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

  this.injectCustomLinks = (req, protocol, host, finalBody) => {

    // Loop thru custom links
    this.config.linksToInject.forEach((link) => {
      if ((link.pattern != undefined && link.pattern.test(req.url)) || (link.matchRoutine != undefined && link.matchRoutine(this.config, req, protocol, host, finalBody))) {

        // Perform gallery page injection
        let insertionLocation = finalBody.lastIndexOf('</body>');
        let injectionHTML = '<link rel="' + link.rel + '"';
        if(link.type && link.type.length > 0) {
          injectionHTML += ' type="' + link.type + '"';
        }
        injectionHTML += ' href="' + link.href + '"';
        if(link.as && link.as.length > 0) {
          injectionHTML += ' as="' + link.as + '"';
        }
        injectionHTML += '>';

        // Insert before closing head if specified
        if (link.loadInHead) {
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

  this.OnProxyReq = (proxyReq, req, res) => {

    /*
    // Determine current site
    let currentSite = (this.config.port === req.socket.localPort) ? this.config.urls : null
    if (!currentSite) {
      for (let eachSite in this.config.sites) {
        if (eachSite.port === req.socket.localPort) {
          currentSite = eachSite;
          break;
        }
      }
    }

    // Modify relevant origin/referrer to be the original host
    const currentOrigin = proxyReq.getHeader('origin')
    if (currentOrigin) {
      proxyReq.setHeader('origin', proxyReq.getHeader('origin').replace('localhost:' + currentSite.port, proxyReq.getHeader('host')));
    }
    const currentReferrer = proxyReq.getHeader('referer')
    if (currentReferrer) {
      proxyReq.setHeader('referer', proxyReq.getHeader('referer').replace('localhost:' + currentSite.port, proxyReq.getHeader('host')));
    }
    */

    // console.log(proxyReq)
  }

  this.OnProxyRes = (proxyRes, req, res) => {

    if (this.config.forceHttpLocationRedirects && proxyRes.headers["location"] && proxyRes.headers["location"].match("https:")) {
      proxyRes.headers["location"] = proxyRes.headers["location"].replace("https:", "http:");
    }

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
      let isDevSite = true;
      let currentSite = (this.config.port === req.socket.localPort) ? this.config.urls : null
      if (!currentSite) {
        for (let eachSite in this.config.sites) {
          if (eachSite.port === req.socket.localPort) {
            currentSite = eachSite;
            isDevSite = false;
            break;
          }
        }
      }

      // Defer write and writeHead
      res.write = () => { };
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
          let output = body;

          if (isDevSite) {
            output = thisProxy.CleanResponseBody(req, output); // some function to manipulate body
          } else {

            thisProxy.config.urls.forEach((url) => {
              output = thisProxy.CleanResponseBodyWithHost(req, output, url, "localhost", thisProxy.config.port);
            });
          }

          thisProxy.config.sites.forEach((eachSite) => {
            if (eachSite.urls != currentSite) {
              eachSite.urls.forEach((url) => {
                output = thisProxy.CleanResponseBodyWithHost(req, output, url, "localhost", eachSite.port, true);
              });
            }
          });

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

          if (tmpLocation) {
            if (tmpLocation.indexOf("https://localhost") > -1) {
              res.setHeader("location", tmpLocation.replace("https:", "http:"));
            }

            if (!isDevSite) {
              if (req.socket.localPort !== thisProxy.config.port) {
                thisProxy.config.urls.forEach((url) => {
                  if (tmpLocation.indexOf(url.host) > -1) {
                    res.setHeader("location", tmpLocation.replace(url.host, "localhost:" + thisProxy.config.port).replace("https:", "http:"));
                  }
                });
              }
            }
            thisProxy.config.sites.forEach((site) => {
              site.urls.forEach((url) => {
                if (tmpLocation.indexOf(url.host) > -1) {
                  res.setHeader("location", tmpLocation.replace(url.host, "localhost:" + site.port).replace("https:", "http:"));
                }
              });
            });

          } else {
            res.setHeader("content-length", output.length);
            res.setHeader("content-encoding", "");
            res.setHeader("transfer-encoding", "");
            res.setHeader("cache-control", "no-cache");
            res.setHeader("x-dev-proxy", "true");
          }

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

  this.GetHttpProxyMiddlewareConfig = (site) => {

    let response = {};

    let siteToHost = site ? site : null;
    if (!siteToHost) {
      siteToHost = {
        urls: this.config.urls,
      }
    }

    // Target
    response.target = siteToHost.urls[0].protocol + siteToHost.urls[0].host;

    // Proxy Agent Config
    response.agent = this.config.agent ? this.config.agent : null;

    // Secure connection
    response.secure = this.config.validateCerts;

    // Header configuration
    response.headers = {
      host: siteToHost.urls[0].host
    };

    // Change Origin
    response.changeOrigin = this.config.changeOrigin;

    // Auto Rewrite
    response.autoRewrite = this.config.autoRewrite;

    // Remote Routes
    if (!site) {
      response.router = this.GetMiddlewareRoutes();
    }

    // Proxy request object
    response.onProxyReq = this.OnProxyReq;

    // Proxy processing object
    response.onProxyRes = this.OnProxyRes;

    return response;
  }

  this.GetBrowserSyncConfig = () => {
    const builtInProxies = [];
    if(this.config.includeLocalWebsocketProxy) {
      builtInProxies.push(proxyMiddleware('/sockjs-node', { target: 'ws://locahost:' + this.config.localWebsocketPort, changeOrigin: true, ws: true }));
    }
    return {
      open: true,
      port: this.config.port,
      ui: {
        port: this.config.uiPort
      },
      https: false,
      cors: true,
      host: 'localhost',
      serveStatic: this.config.localRoutes,
      serveStaticOptions: {
        cacheControl: false
      },
      server: {
        secure: false,
        baseDir: './',
        middleware: [
          ...builtInProxies,
          proxyMiddleware(this.GetHttpProxyMiddlewareConfig())
        ],
        routes: this.GetServerRoutes()
      }
    };
  }

  this.GetMultiSiteBrowserSyncConfig = (site) => {
    return {
      open: false,
      port: site.port,
      ui: {
        port: site.uiPort
      },
      https: false,
      cors: true,
      host: 'localhost',
      serveStatic: this.config.localRoutes,
      serveStaticOptions: {
        cacheControl: false
      },
      server: {
        middleware: [
          proxyMiddleware(this.GetHttpProxyMiddlewareConfig(site))
        ]
      }
    };
  }
};

module.exports = HCDev;
