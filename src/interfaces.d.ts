
import * as cons from 'constants';
//import { ResponseCode } from 'constants';

export const enum ResponseCode {
  NOMATCH = 0,
  EXEC,
  QUERY
}


/**
 * Defines the interface for an analysis
 * reponse
 */
export interface IResponse {
  rating : number,
  type : ResponseCode,
  type2 : number, // ResponseCode,
  context : { [key:string] :string},
  text : string,
  action : IAction,
  prompts : { [key :string ] : { text : string, description : any }; }
}

export const enum EnumActionType {
  STARTURL,
  STARTCMDLINE
}

interface IAction {
  data : any,
  type : EnumActionType
}

/* Defines the interface of the structure of a task */
interface ITodo {
  id: string,
  title: string,
  completed: boolean
}

// Defines the interface of the properties of the TodoItem component
interface ITodoItemProps {
  key : string,
  todo : ITodo;
  editing? : boolean;
  onSave: (val: any) => void;
  onDestroy: () => void;
  onEdit: ()  => void;
  onCancel: (event : any) => void;
  onToggle: () => void;
}

// Defines the interface of the state of the TodoItem component
interface ITodoItemState {
  editText : string
}

// Defines the interface of the properties of the Footer component
interface ITodoFooterProps {
  completedCount : number;
  onClearCompleted : any;
  nowShowing : string;
  count : number;
}

// Defines the TodoModel interface
interface ITodoModel {
  key : any;
  todos : Array<ITodo>;
  onChanges : Array<any>;
  subscribe(onChange);
  inform();
  addTodo(title : string);
  toggleAll(checked);
  toggle(todoToToggle);
  destroy(todo);
  save(todoToSave, text);
  clearCompleted();
}

// Defines the interface of the properties of the App component
interface IAppProps {
  model : ITodoModel;
}

// Defines the interface of the state of the App component
interface IAppState {
  editing? : string;
  nowShowing? : string
}