/* todo: 
generate uuid
maintain list: auto list name: modelName
m-n sample code
study the the get(path) function
*/
export const user_model = {
  modelName: "users",
  id: "",
  firstname: "",
  lastname: "",
  detailsRecord: "users_detail/id" // 一对一关系可要可不要
}

export const user_detail_model = {
  modelName: "users_detail",
  id: "",
  address: "",
  cardNumber: "xxx-xxx-xx"
}