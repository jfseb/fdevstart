

export const enum EnumResponseCode {
  NOMATCH = 0,
  EXEC,
  QUERY
}

export interface IPromptDescription {
  description : string,
  type : string,
  pattern : RegExp,
  message : string,
  default : string,
  required : boolean
}

export type context = { [key:string] :string};

/**
 * Defines the interface for an analysis
 * reponse
 */
export interface IResponse {
  rating : number,
  type : EnumResponseCode,
  query : string,
  context : { [key:string] :string},
  text : string,
  action : IAction,
  prompts : {
    [key :string ] : {
      text : string,
      /**
       * Follows the features of NPM prompts
       */
      description : IPromptDescription
      };
  }
}

export const enum EnumActionType {
  STARTURL,
  STARTCMDLINE
}

export interface IAction {
  data : any,
  type : EnumActionType,
  pattern : string,
  concrete : string
}
