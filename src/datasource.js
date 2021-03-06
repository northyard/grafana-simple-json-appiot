import _ from "lodash";
import * as axios from "./node_modules/axios/dist/axios";
import * as pako from "./node_modules/pako/dist/pako";




export class GenericDatasource {



  constructor(instanceSettings, $q, backendSrv, templateSrv) {
   /* this.geolocationv = []
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
    }*/
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
    //var gzip = require('gzip-js')
    //var zlib = require('zlib');
    var Base64 = {
      characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      encode: function (string) {
        var characters = Base64.characters;
        var result = '';

        var i = 0;
        do {
          var a = string.charCodeAt(i++);
          var b = string.charCodeAt(i++);
          var c = string.charCodeAt(i++);

          a = a ? a : 0;
          b = b ? b : 0;
          c = c ? c : 0;

          var b1 = (a >> 2) & 0x3F;
          var b2 = ((a & 0x3) << 4) | ((b >> 4) & 0xF);
          var b3 = ((b & 0xF) << 2) | ((c >> 6) & 0x3);
          var b4 = c & 0x3F;

          if (!b) {
            b3 = b4 = 64;
          } else if (!c) {
            b4 = 64;
          }

          result += Base64.characters.charAt(b1) + Base64.characters.charAt(b2) + Base64.characters.charAt(b3) + Base64.characters.charAt(b4);

        } while (i < string.length);

        return result;
      },

      decode: function (string) {
        var characters = Base64.characters;
        var result = '';

        var i = 0;
        do {
          var b1 = Base64.characters.indexOf(string.charAt(i++));
          var b2 = Base64.characters.indexOf(string.charAt(i++));
          var b3 = Base64.characters.indexOf(string.charAt(i++));
          var b4 = Base64.characters.indexOf(string.charAt(i++));

          var a = ((b1 & 0x3F) << 2) | ((b2 >> 4) & 0x3);
          var b = ((b2 & 0xF) << 4) | ((b3 >> 2) & 0xF);
          var c = ((b3 & 0x3) << 6) | (b4 & 0x3F);

          result += String.fromCharCode(a) + (b ? String.fromCharCode(b) : '') + (c ? String.fromCharCode(c) : '');

        } while (i < string.length);

        return result;
      },

      decodeBase64: function(s) {
        var e={},i,b=0,c,x,l=0,a,r='',w=String.fromCharCode,L=s.length;
        var A="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for(i=0;i<64;i++){e[A.charAt(i)]=i;}
        for(x=0;x<L;x++){
            c=e[s.charAt(x)];b=(b<<6)+c;l+=6;
            while(l>=8){((a=(b>>>(l-=8))&0xff)||(x<(L-2)))&&(r+=w(a));}
        }
        return r;
      },
      /* will return a  Uint8Array type */
      decodeArrayBuffer: function (input) {
        var bytes = (input.length / 4) * 3;
        var ab = new ArrayBuffer(bytes);
        this.decode(input, ab);

        return ab;
      },

      removePaddingChars: function (input) {
        var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
        if (lkey == 64) {
          return input.substring(0, input.length - 1);
        }
        return input;
      },

      decode2: function (input, arrayBuffer) {
        //get last chars to see if are valid
        input = this.removePaddingChars(input);
        input = this.removePaddingChars(input);

        var bytes = parseInt((input.length / 4) * 3, 10);

        var uarray;
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        var j = 0;

        if (arrayBuffer)
          uarray = new Uint8Array(arrayBuffer);
        else
          uarray = new Uint8Array(bytes);

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        for (i = 0; i < bytes; i += 3) {
          //get the 3 octects in 4 ascii chars
          enc1 = this._keyStr.indexOf(input.charAt(j++));
          enc2 = this._keyStr.indexOf(input.charAt(j++));
          enc3 = this._keyStr.indexOf(input.charAt(j++));
          enc4 = this._keyStr.indexOf(input.charAt(j++));

          chr1 = (enc1 << 2) | (enc2 >> 4);
          chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          chr3 = ((enc3 & 3) << 6) | enc4;

          uarray[i] = chr1;
          if (enc3 != 64) uarray[i + 1] = chr2;
          if (enc4 != 64) uarray[i + 2] = chr3;
        }

        return uarray;
      }
    };

    var query = this.buildQueryParameters(options);
    query.targets = query.targets.filter(t => !t.hide);
    const caller = this
    const req = query

    if (query.targets.length <= 0) {
      return this.q.when({ data: [] });
    }
    var getQueryForAppIoT = function(resolve, reject) { 
      let promiseArray = [];
      req.targets.forEach((target) => {
        var resource = null;
        if (target.target.indexOf('TimeWeightedAverage') >= 0 || target.target.indexOf('Variance') >= 0) {
          var targetresource = target.target.split(',')[0]
          resource = caller.resourceList.find(resource => {
            return resource.Name == targetresource
          })
        }
        else {
          resource = caller.resourceList.find(resource => {
            return resource.Name == target.target
          })
        }
        var from = new Date(req.range.from).getTime();
        var to = new Date(req.range.to).getTime();
        var url = null;
        if (target.target.indexOf('TimeWeightedAverage') >= 0) {
          url = `${caller.appiot.apiURI}/measurements/${resource.Id}/aggregations?measurementQuery.resolution=300000&measurementQuery.timespanStart=${from}&measurementQuery.timespanEnd=${to}&measurementQuery.aggregationType=TimeWeightedAverage`;
        }
        else if (target.target.indexOf('Variance') >= 0) {
          url = `${caller.appiot.apiURI}/measurements/${resource.Id}/aggregations?measurementQuery.resolution=300000&measurementQuery.timespanStart=${from}&measurementQuery.timespanEnd=${to}&measurementQuery.aggregationType=Variance`;
        }
        /*else if (target.target.indexOf('HealthSensor Accuracy') >= 0) {
          resource = caller.resourceList.find(resource => {
            return resource.Name == "acHealthSensor"
          })
          url = `${caller.appiot.apiURI}/measurements/${resource.Id}/since/${from}/to/${to}`;
          let promise = axios.get(url, { 'headers': caller.appiot.apiHeaders, 'target': 'HealthSensorAcc', 'targettype': target.type }).catch((err) => { console.log(err) })
          promiseArray.push(promise)  
          resource = caller.resourceList.find(resource => {
            return resource.Name == "HealthSensor"
          })
          url = `${caller.appiot.apiURI}/measurements/${resource.Id}/since/${from}/to/${to}`;
          promise = axios.get(url, { 'headers': caller.appiot.apiHeaders, 'target': 'HealthSensorPre', 'targettype': target.type }).catch((err) => { console.log(err) })
          promiseArray.push(promise) 
          return //continue 
        }*/
        else {
          var currenttime = new Date().getTime();
          if ((currenttime-to)>0 && (currenttime-to) <= 60000 ) { // if time is within "latest", we may need to purposely inject latest measurement to the result
            url = `${caller.appiot.apiURI}/resources/${resource.Id}`;
            let promise = axios.get(url, { 'headers': caller.appiot.apiHeaders, 'target': target.target+'_latestmeasurement', 'targettype': target.type }).catch((err) => { console.log(err) })
            promiseArray.push(promise)
          }
          url = `${caller.appiot.apiURI}/measurements/${resource.Id}/since/${from}/to/${to}`;
        }
        let promise = axios.get(url, { 'headers': caller.appiot.apiHeaders, 'target': target.target, 'targettype': target.type }).catch((err) => { console.log(err) })
        promiseArray.push(promise)
    
      })
      var tsResultArray = [];
      // perform concurrent get calls for all smart objects                       
      //var healthSensorAcc = [];
      //var healthSensorPre = [];
      var latestMeasurementTimeObj = {};
      var latestMeasurementValueObj = {};
      var from = new Date(req.range.from).getTime();
      var to = new Date(req.range.to).getTime();
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
                  if (part.length < 3) {
  
                  }
                  else {
                    var row = []
                    row.push(value.UnixTimestamp)
                    row.push(value.sv)
                    row.push(part[2])
                    var lat = Number(part[0]);// - Math.random() * 0.002
                    var lon = Number(part[1]);// - Math.random() * 0.003
                    var geoh = caller.GeohashEncode(lat, lon, 9)
                    row.push(geoh)
                    row.push(new Date(value.UnixTimestamp).toISOString())
                    tsResult.rows.push(row)
                  }
                })
              }
              else {
                if (args[i].data.AggregationType != null) {
                  tsResult.columns = []
                  var col1 = {}
                  col1.text = 'Time'
                  col1.type = 'time'
                  col1.sort = true,
                    col1.desc = true,
                    tsResult.columns.push(col1)
                  var col = {}
                  col.text = 'm'
                  col.type = 'number'
                  tsResult.columns.push(col)
                  tsResult.rows = []
                  tsResult.type = 'table'
                  args[i].data.v.forEach((value) => { // resource obj
                    var row = []
                    row.push(value.t)
                    row.push(value.m)
                    tsResult.rows.push(row)
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
            }
            else { // non table
              tsResult.target = args[i].config.target
              tsResult.datapoints = []
  
              if (args[i].data.AggregationType != null) {
                //this is aggregation
                args[i].data.v.forEach((value) => { // resource obj
                  var arr = []
                  arr.push(value.m)
                  arr.push(value.t)
                  tsResult.datapoints.push(arr)
                })
              }
              else {
                if (tsResult.target == 'ecgBlob') {                      
                  args[i].data.v.forEach((value) => { // resource obj
                    var arr = []
                    var val = 0
                    if (value.sv != null) {
                      val = value.sv                      
                        var data = val
                        //const buffer = Buffer.from(data, 'base64');
                        const timestamp = value.UnixTimestamp
                        var unzipdata =''
                        try{                          
                          // Create Base64 Object
                          //var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}                          
                          var decodeddata = Base64.decode2(data)
                          unzipdata = pako.inflate(decodeddata,{ to: 'string' })
                          var varr = unzipdata.split(',')
                          var firstts = timestamp - varr.length * 10 / 3 // fs = 300                            
                          for (var i = 0; i < varr.length; i += 150) {
                            var arr = []
                            arr.push(varr[i]/1000)
                            var ts = firstts + i * 10 / 3
                            arr.push(ts)
                            tsResult.datapoints.push(arr)
                          }
                          //console.log(unzipdata.toString());
                        } catch (err){
                          console.log(err);  
                        }
                    }
                  })
                  tsResult.datapoints = tsResult.datapoints.sort(function(a,b) { // sort according to ts
                    return a[1] - b[1];
                    });
                }
                else if (tsResult.target.indexOf('_latestmeasurement') > 0)  {   
                  if(args[i].data.LatestMeasurement.UnixTimestamp < to && args[i].data.LatestMeasurement.UnixTimestamp > from) {
                    var endind =  tsResult.target.indexOf('_latestmeasurement')
                    var targetname = tsResult.target.substring(0, endind)
                    latestMeasurementTimeObj[targetname]  = args[i].data.LatestMeasurement.UnixTimestamp
                    var val = 0
                    if (args[i].data.LatestMeasurement.v != null) {
                      val = args[i].data.LatestMeasurement.v
                    }
                    else if (args[i].data.LatestMeasurement.sv != null) {
                      val = args[i].data.LatestMeasurement.sv
                    }
                    else {
                      if(args[i].data.LatestMeasurement.bv) {
                        val = 1 
                      }
                      else {
                        val = 0
                      }                    
                    }
                    latestMeasurementValueObj[targetname]  = val
                  }
                }
                else {
                  var voidLatestMeasurement  = false;
                  args[i].data.v.forEach((value) => { // resource obj
                    var arr = []
                    var val = 0
                    if (value.v != null) {
                      val = value.v
                    }
                    else if (value.sv != null) {
                      val = value.sv
                    }
                    else {
                      if(value.bv) {
                        val = 1 
                      }
                      else {
                        val = 0
                      }
                      
                    }
                    arr.push(val)
                    arr.push(value.UnixTimestamp)
                    tsResult.datapoints.push(arr)
                    if(latestMeasurementTimeObj[tsResult.target] != null ) {
                      if(value.UnixTimestamp == latestMeasurementTimeObj[tsResult.target]) {
                        voidLatestMeasurement = true;
                      }
                    }
                  })
                  if(latestMeasurementTimeObj[tsResult.target] != null && voidLatestMeasurement!= true ) {
                    var arr = []
                    arr.push( latestMeasurementValueObj[tsResult.target])
                    arr.push( latestMeasurementTimeObj[tsResult.target])
                    tsResult.datapoints.push(arr) // append latest measurement
                  }
                  
                }
              }
            }            
            if(tsResult.type == 'table'){
              tsResultArray.push(tsResult)
            }
            else {
              if(tsResult.datapoints.length>0){
                tsResultArray.push(tsResult)
              }
            }
          }
          var result = {}
          result.data = tsResultArray
          resolve(result);
  
        }))
        .catch((error) => {
          console.log(error);
          reject(error)
        })
      };
    

    /*return this.doRequest({
      url: this.url + '/query',
      data: query,
      method: 'POST'
    });*/
    if (this.resourceList == null) {
      return new Promise(function (resolve, reject) {
        caller.getAllResourceUrlFromDevice(1)
        .then((result) => {
          caller.resourceList = result;        
          console.log(caller.resourceList.length)
          return getQueryForAppIoT(resolve, reject)        
        })
        .catch((err) => {
          console.log(err)
          reject(err)
        })
      })
    }
    else {
      return new Promise(function (resolve, reject) {
        getQueryForAppIoT(resolve, reject)
            });
    }
    
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
            if (time <= to && time >= from && event.EventCategoryName.toUpperCase() ==  calleroption.annotation.query.toUpperCase()) {
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
            if(resource.Name == 'BleSensor' || resource.Name == 'Heart Rate'){
              list.push(resource.Name + ", 5min TimeWeightedAverage")
              list.push(resource.Name + ", 5min Variance")
            }            
            //if(resource.Name == 'HealthSensor'){
            //  list.push(resource.Name + " Accuracy")
            //}
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

