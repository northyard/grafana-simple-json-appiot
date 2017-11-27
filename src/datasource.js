import _ from "lodash";
import * as axios from "./node_modules/axios/dist/axios";


export class GenericDatasource {



  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.geolocationv = []
    for (var i = 0; i < 50; i++) {
      var a = {}
      a.UnixTimestamp = (new Date().getTime()) - Math.random() * 600000;
      var b = '22.288702,114.211625,30'
      var bp = b.split(',')
      bp[0] = Number(bp[0]) - Math.random() * 0.002
      bp[1] = Number(bp[1]) - Math.random() * 0.003
      bp[2] = Math.floor(Number(bp[2]) + Math.random() * 20)
      a.sv = bp[0] + ',' + bp[1] + ',' + bp[2]
      this.geolocationv.push(a)
    }
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = { 'Content-Type': 'application/json' };
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
    console.log(instanceSettings.jsonData)
    this.appiot = {
      //'apiURI': 'https://iotabusinesslab-api.sensbysigma.com/api/v3',
      'apiURI': instanceSettings.url,
      'apiHeaders': {
        'Authorization': instanceSettings.jsonData.appiotaccesstoken,
        'X-DeviceNetwork': instanceSettings.jsonData.appiotdevicenetwork,
        //'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkbklkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwicGVybWlzc2lvbnMiOm51bGwsImlzcyI6ImFwcGlvdHdlYmFwaSIsImF1ZCI6ImFwcGlvdHdlYmFwaSIsImV4cCI6MTUxNTkzMzM1MywibmJmIjoxNTA4NTA4OTEwLCJpYXQiOjE1MDg1MDg5MTAsIm5hbWUiOiJCTEFCSEsiLCJ0b2tlblR5cGUiOiJhY2Nlc3NUb2tlbiIsInVzZXJJZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.E0xhLJjh+tEO2w7Tvtx+sco6h8WlWN2nVSGHpTKkn0Q=',
        //'X-DeviceNetwork': '613b7124-e2db-4e76-9feb-102a869bd497',
        'Content-Type': 'application/json',
      },
    }

    this.resourceList = null;
    this.getAllResourceUrlFromDevice(1)
      .then((result) => {
        this.resourceList = result;
        /*var resource = this.resourceList.find(resource => {
          return resource.Name == "BleSensor"
        })*/
        console.log(this.resourceList.length)
      })
      .catch((err) => {
        console.log(err)
      })

  }


  getAllResourceUrlFromDevice(rweflag) { // objecttypeid is the lwm2m object id in the resourceurl e.g. 3303      
    const deviceidentifier = this.name.split("/")[0]
    const objecttypeid = this.name.split("/")[1]
    const appiot = this.appiot
    return new Promise(function (resolve, reject) {
      let url = `${appiot.apiURI}/devices?filter[0].Key=deviceidentifier&filter[0].Value=${deviceidentifier}`
      axios.get(url, { 'headers': appiot.apiHeaders })
        .then((result) => {
          if (result.data.Rows.length > 0) {
            let resourceList = [];
            let url = `${appiot.apiURI}/devices/${result.data.Rows[0].Id}`;
            axios.get(url, { 'headers': appiot.apiHeaders })
              .then((result) => {
                let promiseArray = [];
                result.data.SmartObjects.forEach((obj) => {
                  if (obj.TypeId == objecttypeid) {
                    url = `${appiot.apiURI}/resources?filter[0].Key=smartobjectid&filter[0].Value=${obj.Id}`;
                    let promise = axios.get(url, { 'headers': appiot.apiHeaders })
                    promiseArray.push(promise)
                  }
                })
                if (promiseArray.length == 0) {
                  reject(`Cannot found matching object type id?: ${objecttypeid}`);
                }
                // perform concurrent get calls for all smart objects                       
                axios.all(promiseArray)
                  .then(axios.spread((...args) => {
                    for (let i = 0; i < args.length; i++) {
                      args[i].data.Rows.forEach((resource) => { // resource obj
                        if ((resource.AccessType & rweflag) > 0) { // required bitand with flag
                          resourceList.push(resource)
                        }
                      })
                    }
                    if (resourceList.length == 0) {
                      reject(`Cannot found matching AccessType?: ${rweflag}`);
                    }
                    resolve(resourceList)
                  }))
                  .catch((error) => {
                    console.log(error);
                    reject(`error getting /resources?: ${error.message}`);
                  })
              })
              .catch((error) => {
                console.log(error);
                reject(`error getting /devices/id: ${error.message}`);
              })
          } else {
            reject(`deviceidentifier not found: ${error.message}`);
          }
        })
        .catch((error) => {
          console.log(error);
          reject(`error getting deviceidentifier: ${error.message}`);
        })
    })
  }



  GeohashEncode(lat, lon, precision) {
    var Geohash = {};
    /* (Geohash-specific) Base32 map */
    Geohash.base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    Geohash.decode = function (geohash) {

      var bounds = Geohash.bounds(geohash); // <-- the hard work
      // now just determine the centre of the cell...

      var latMin = bounds.sw.lat, lonMin = bounds.sw.lon;
      var latMax = bounds.ne.lat, lonMax = bounds.ne.lon;

      // cell centre
      var lat = (latMin + latMax) / 2;
      var lon = (lonMin + lonMax) / 2;

      // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
      lat = lat.toFixed(Math.floor(2 - Math.log(latMax - latMin) / Math.LN10));
      lon = lon.toFixed(Math.floor(2 - Math.log(lonMax - lonMin) / Math.LN10));

      return { lat: Number(lat), lon: Number(lon) };
    };

    // infer precision?
    if (typeof precision == 'undefined') {
      // refine geohash until it matches precision of supplied lat/lon
      for (var p = 1; p <= 12; p++) {
        var hash = this.GeohashEncode(lat, lon, p);
        var posn = Geohash.decode(hash);
        if (posn.lat == lat && posn.lon == lon) return hash;
      }
      precision = 12; // set to maximum
    }

    lat = Number(lat);
    lon = Number(lon);
    precision = Number(precision);

    if (isNaN(lat) || isNaN(lon) || isNaN(precision)) throw new Error('Invalid geohash');

    var idx = 0; // index into base32 map
    var bit = 0; // each char holds 5 bits
    var evenBit = true;
    var geohash = '';

    var latMin = -90, latMax = 90;
    var lonMin = -180, lonMax = 180;

    while (geohash.length < precision) {
      if (evenBit) {
        // bisect E-W longitude
        var lonMid = (lonMin + lonMax) / 2;
        if (lon >= lonMid) {
          idx = idx * 2 + 1;
          lonMin = lonMid;
        } else {
          idx = idx * 2;
          lonMax = lonMid;
        }
      } else {
        // bisect N-S latitude
        var latMid = (latMin + latMax) / 2;
        if (lat >= latMid) {
          idx = idx * 2 + 1;
          latMin = latMid;
        } else {
          idx = idx * 2;
          latMax = latMid;
        }
      }
      evenBit = !evenBit;

      if (++bit == 5) {
        // 5 bits gives us a character: append it and start over
        geohash += Geohash.base32.charAt(idx);
        bit = 0;
        idx = 0;
      }
    }

    return geohash;
  };

  query(options) {
    var query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);

    if (query.targets.length <= 0) {
      return this.q.when({ data: [] });
    }

    /*return this.doRequest({
      url: this.url + '/query',
      data: query,
      method: 'POST'
    });*/
    const caller = this
    const req = query
    return new Promise(function (resolve, reject) {

      let promiseArray = [];
      req.targets.forEach((target) => {
        var resource = caller.resourceList.find(resource => {
          return resource.Name == target.target
        })
        var from = new Date(req.range.from).getTime();
        var to = new Date(req.range.to).getTime();
        var url = `${caller.appiot.apiURI}/measurements/${resource.Id}/since/${from}/to/${to}`;
        let promise = axios.get(url, { 'headers': caller.appiot.apiHeaders, 'target': target.target, 'targettype': target.type }).catch((err) => { console.log(err) })
        promiseArray.push(promise)
      })
      var tsResultArray = [];
      // perform concurrent get calls for all smart objects                       
      axios.all(promiseArray)
        .then(axios.spread((...args) => {
          for (let i = 0; i < args.length; i++) {
            var tsResult = {}
            if (args[i] == null) {
              continue;
            }

            if (args[i].config.targettype == 'table') {
              if (args[i].config.target == 'GeoLocation') {
                tsResult.columns = []
                var col1 = {}
                col1.text = 'Time'
                col1.type = 'time'
                col1.sort = true,
                  col1.desc = true,
                  tsResult.columns.push(col1)
                var col2 = {}
                col2.text = 'sv'
                col2.type = 'string'
                tsResult.columns.push(col2)
                var col3 = {}
                col3.text = 'metric'
                col3.type = 'string'
                tsResult.columns.push(col3)
                var col4 = {}
                col4.text = 'geohash'
                col4.type = 'string'
                tsResult.columns.push(col4)
                var col5 = {}
                col5.text = 'timestr'
                col5.type = 'string'
                tsResult.columns.push(col5)
                tsResult.rows = []
                tsResult.type = 'table'
              
                args[i].data.v.forEach((value) => { // resource obj

                //caller.geolocationv.forEach((value) => { // resource obj
                  var part = value.sv.split(",")
                  if (part.length <3) {
                    
                  }
                  else {
                    var row = []
                    row.push(value.UnixTimestamp)
                    row.push(value.sv)                  
                    row.push(part[2])
                    var lat = Number(part[0]) - Math.random() * 0.002
                    var lon = Number(part[1]) - Math.random() * 0.003
                    var geoh = caller.GeohashEncode(lat,lon,9)
                    row.push(geoh)
                    row.push(new Date(value.UnixTimestamp).toISOString())
                    tsResult.rows.push(row)
                  }
                })
              }
              else {
                tsResult.columns = []
                var col1 = {}
                col1.text = 'Time'
                col1.type = 'time'
                col1.sort = true,
                  col1.desc = true,
                  tsResult.columns.push(col1)
                var col = {}
                col.text = 'v'
                col.type = 'number'
                tsResult.columns.push(col)
                col.text = 'sv'
                col.type = 'string'
                tsResult.columns.push(col)
                col.text = 'bv'
                col.type = 'boolean'
                tsResult.columns.push(col)
                tsResult.rows = []
                tsResult.type = 'table'
                args[i].data.v.forEach((value) => { // resource obj
                  var row = []
                  row.push(value.UnixTimestamp)
                  row.push(value.v)
                  row.push(value.sv)
                  row.push(value.bv)
                  tsResult.rows.push(row)
                })
              }
            }
            else {
              tsResult.target = args[i].config.target
              tsResult.datapoints = []
              args[i].data.v.forEach((value) => { // resource obj
                var arr = []
                var val = 0
                if (value.v != null) {
                  val = value.v
                }
                else if (value.sv != null) {
                  val = value.sv
                }
                arr.push(val)
                arr.push(value.UnixTimestamp)
                tsResult.datapoints.push(arr)
              })
            }
            tsResultArray.push(tsResult)
          }
          var result = {}
          result.data = tsResultArray
          resolve(result);

        }))
        .catch((error) => {
          console.log(error);
          reject(error)
        })
    })
  }

  testDatasource() {
    const caller = this
    return new Promise(function (resolve, reject) {
      caller.getAllResourceUrlFromDevice(1)
        .then((result) => {
          caller.resourceList = result;
          resolve({ status: "success", message: "AppIoT data source is working. Connected with " + caller.resourceList.length + " resources.", title: "Success" })
        })
        .catch((err) => {
          console.log(err)
          reject(err)
        })
    })


    /*return this.doRequest({
      url: this.url + '/',
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });*/
  }

  annotationQuery(options) {
    const calleroption = options
    const caller = this
    return new Promise(function (resolve, reject) {
      var eventcategoryname = calleroption.annotation.query //"BLABHK_IoTServiceApp_Alert" // need to put this to the configuration menu
      let url = `${caller.appiot.apiURI}/events?filter[0].Key=EventCategoryName&filter[0].Value=${eventcategoryname}`
      axios.get(url, { 'headers':caller.appiot.apiHeaders }) // todo get pagination
        .then((result) => {
          var arr = []
          result.data.Rows.forEach((event)=>{
            var time = new Date(event.CreatedDateTime).getTime()
            var from = new Date(calleroption.range.from).getTime()
            var to = new Date(calleroption.range.to).getTime()
            if (time <= to && time >= from) {
              var ann = {}
              ann.name = eventcategoryname
              ann.enabled = true
              ann.datasource = 'appiot datasource'
              ann.showLine = true
              var annotation = {}
              annotation.annotation = calleroption.annotation
              annotation.title = event.RuleName
              annotation.time = time
              annotation.text = 'created:' + event.CreatedDateTime + 'reset:' + event.ResetDateTime
              annotation.tags = calleroption.annotation.query
              arr.push(annotation)
            }
          })
          resolve(arr)
        })
        .catch((err)=>{
          console.log(err)
          reject(err)
        })
      })
          

    /*var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
    var annotationQuery = {
      range: options.range,
      annotation: {
        name: options.annotation.name,
        datasource: options.annotation.datasource,
        enable: options.annotation.enable,
        iconColor: options.annotation.iconColor,
        query: query
      },
      rangeRaw: options.rangeRaw
    };

    return this.doRequest({
      url: this.url + '/annotations',
      method: 'POST',
      data: annotationQuery
    }).then(result => {
      return result.data;
    });
    return [];*/
  }

  metricFindQuery(query) {
    /* var interpolated = {
         target: this.templateSrv.replace(query, null, 'regex')
     };
 
     return this.doRequest({
       url: this.url + '/search',
       data: interpolated,
       method: 'POST',
     }).then(this.mapToTextValue);*/

       // generate random geolocation data
       
    const caller = this
    console.log('here metricFindQuery')
    return new Promise(function (resolve, reject) {
      caller.getAllResourceUrlFromDevice(1)
        .then((result) => {
          caller.resourceList = result;
          var list = []
          caller.resourceList.forEach((resource) => {
            list.push(resource.Name)
          })
          var result = {}
          result.data = list
          resolve(caller.mapToTextValue(result))
        })
        .catch((err) => {
          console.log(err)
          reject(err)
        })

    })

  }

  mapToTextValue(result) {
    return _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      } else if (_.isObject(d)) {
        return { text: d, value: i };
      }
      return { text: d, value: d };
    });
  }

  doRequest(options) {
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;

    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    var targets = _.map(options.targets, target => {
      return {
        target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
        refId: target.refId,
        hide: target.hide,
        type: target.type || 'timeserie'
      };
    });

    options.targets = targets;

    return options;
  }
}
