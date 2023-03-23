import {patch, diff} from 'jiff'

let patchit = [
  {
    "op": "add",
    "path": "/todos/lfjl84fc-2gz8ffs80us/users/lfjl8081-1azwb5h6csm",
    "value": "lfjl8081-1azwb5h6csm"
}
]

let snapshot = {
  "lfjl84fc-2gz8ffs80us": {
      "id": "lfjl84fc-2gz8ffs80us",
      "name": "brew bear",
      "done": false,
      "users": {
          "lfjl8081-1azwb5h6csm": "lfjl8081-1azwb5h6csm"
      }
  }
} 

let doc = 
{
  "lfjl84fc-2gz8ffs80us": {
      "id": "lfjl84fc-2gz8ffs80us",
      "name": "brew bear",
      "done": false,
      "users": {}
  }
} 

let patchliter = diff(doc, snapshot)
console.log(patchliter)