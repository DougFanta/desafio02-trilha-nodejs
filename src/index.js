const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers
  const findUser = users.find(user => user.username === username)
  
  if(!findUser){
    return response.status(404).json({error: "username does not exists"})
  }

  
  request.user = findUser
  return next()
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request
  const todosLength = user.todos.length
  const pro = user.pro
  if(todosLength == 10 && pro == false){
    return response.status(403).json({error: "Upgrade to pro to use more todos"})
  }
  
  request.user = user
  return next()
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers
  const { id } = request.params
  const findUser = users.find(i => i.username === username)

  if(!findUser){
    return response.status(404).json({error: "User does not exists"})
  }
  
  
  const verifyUserTodo = findUser.todos.find(i => i.id === id)
  const validateTodoId = validate(id)

  if(!validateTodoId){
    return response.status(400).json({error: "Todo Id must be an uuid"})
    
  }

  if(!verifyUserTodo){
    return response.status(404).json({error: "Todo does not exists"})

  }
  
  request.user = findUser
  request.todo = verifyUserTodo
  return next()
  

}

function findUserById(request, response, next) {
  const { id } = request.params
  const existsUser = users.find(i => i.id === id)

  if(existsUser){
    request.user = existsUser
    return next()
  }

  return response.status(404).json({error: "User not found"})
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});


app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};