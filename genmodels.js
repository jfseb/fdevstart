// var globalTunnel = require('global-tunnel')

//  host: 'proxy.exxxample.com',
//  port: 8080
// })


var process = require('process');
var root = (process.env.FSD_COVERAGE) ? './gen_cov' : './gen';

//var debug = require('debug')('vismodel.nunit');

const Vismodel = require(root + '/model/vismodel.js');

const Model = require('fdevsta_monmove').Model;

var mdltest = Model.loadModels('testmodel');


try {
  fs.mkdirSync('./testmodel/graph');
} catch (e) {
   /*emtpy*/
}

Vismodel.tabModels(mdltest, './app/server/views/models');


try {
  fs.mkdirSync('./sensitive/graph');
} catch (e) {
   /*emtpy*/
}

var mdlsens = Model.loadModels('sensitive');

Vismodel.makeLunrIndex('testmodel/iupac','./app/public/js/model_iupac');
Vismodel.makeLunrIndex('sensitive/bom','./app/public/js/model_fioribom');
Vismodel.makeLunrIndex('sensitive/SOBJ_Tables','./app/public/js/model_sobj_tables');
Vismodel.tabModels(mdlsens, './app/server/views/models');


