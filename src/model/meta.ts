/**
 * Functionality managing the match models
 *
 * @file
 */

import * as intf from 'constants';

import * as debug from 'debug';

var debuglog = debug('meta');


import * as logger from '../utils/logger';
const loadlog = logger.logger('modelload', '');
import *  as IMatch from '../match/ifmatch';
import * as Tools from '../match/tools';
import * as Model from './model';


/**
 * the model path, may be controlled via environment variable
 */
var modelPath = process.env["ABOT_MODELPATH"] || "testmodel";

export interface IMeta {
    toName()  : string,
    toType()  : string,
    toFullString() : string
}


const separator = " -:- ";
const validTypes = ["relation", "category", "domain"];

export class AMeta implements IMeta {
    name: string;
    type : string;
    constructor(type : string, name : string) {
        if(validTypes.indexOf(type) < 0) {
            throw new Error("Illegal Type " + type);
        }
        this.name = name;
        this.type = type;
    }
    toName() {
        return this.name;
    }
    toFullString() {
        return this.type + separator + this.name;
    }
    toType() {
        return this.type;
    }
}


interface Meta {
    parseIMeta : (string) => IMeta,
    // constructors
    Domain : (string) => IMeta,
    Category : (string) => IMeta,
    Relation : (string) => IMeta
}

export function getStringArray(arr : IMeta[]) {
    return arr.map(function(oMeta : IMeta) {
        return oMeta.toName();
    });
}

export const RELATION_hasCategory = "hasCategory";
export const RELATION_isCategoryOf = "isCategoryOf";

function parseAMeta(a : string) : IMeta {
            var r = a.split(separator);
            if(!r || r.length !== 2) {
                throw new Error("cannot parse " + a + " as Meta");
            }
            switch(r[0]) {
                case "category":
                    return getMetaFactory().Category(r[1]);
                case "relation":
                    return getMetaFactory().Relation(r[1]);
                case "domain":
                    return getMetaFactory().Domain(r[1]);
                default:
                    throw new Error("unknown meta type" + r[0]);
            }
}

export function getMetaFactory() : Meta {
  return {
        Domain : function(a : string) : IMeta {
            return new AMeta("domain", a);
        },
        Category : function(a : string) : IMeta {
            return new AMeta("category",a);
        },
        Relation : function(a : string) : IMeta {
            return new AMeta("relation",a);
        },
        parseIMeta : parseAMeta
   };
}

/*
export function getCategoriesForDomain(theModel : IModels, domain : string) : string[] {
    if(theModel.domains.indexOf(domain) < 0) {
        throw new Error("Domain " + domain + " not part of model");
    }
    theModel.meta.get(Meta.Domain(domain), Meta.Relation("hasCategory"));
}
*/