'use strict';

const Promise = require('bluebird') // Promise library
const expect = require('chai').expect // Assertion library

// Init API instance
const api = require('../index')({ version: 'v1.0' })
const api2 = require('../index')({ version: 'v1.0' })
const api3 = require('../index')({ version: 'v1.0' })

// NOTE: Set test to true
api._test = true;
api2._test = true;
api3._test = true;

let event = {
  httpMethod: 'get',
  path: '/test',
  body: {},
  headers: {
    'Content-Type': 'application/json'
  }
}

/******************************************************************************/
/***  DEFINE TEST MIDDLEWARE                                                ***/
/******************************************************************************/

api.use(function(req,res,next) {
  req.testMiddleware = '123'
  next()
});

// Middleware that accesses params, querystring, and body values
api.use(function(req,res,next) {
  req.testMiddleware2 = '456'
  req.testMiddleware3 = req.params.test
  req.testMiddleware4 = req.query.test ? req.query.test : null
  req.testMiddleware5 = req.body.test ? req.body.test : null
  next()
});

// Add middleware with promise/delay
api.use(function(req,res,next) {
  if (req.route === '/testPromise') {
    let start = Date.now()
    Promise.try(() => {
      for(let i = 0; i<100000000; i++) {}
      return true
    }).then((x) => {
      // console.log('Time:',Date.now()-start);
      req.testMiddlewarePromise = 'test'
      next()
    })
  } else {
    next()
  }
});


api2.use('/test',function(req,res,next) {
  req.testMiddleware = true
  next()
})

api2.use('/test/*',function(req,res,next) {
  req.testMiddlewareWildcard = true
  next()
})

api2.use('/test/:param1',function(req,res,next) {
  req.testMiddlewareParam = true
  next()
})

api2.use('/test/testing',function(req,res,next) {
  req.testMiddlewarePath = true
  next()
})


api3.use(['/test','/test/:param1','/test2/*'],function(req,res,next) {
  req.testMiddlewareAll = true
  next()
})

/******************************************************************************/
/***  DEFINE TEST ROUTES                                                    ***/
/******************************************************************************/

api.get('/test', function(req,res) {
  res.status(200).json({ method: 'get', testMiddleware: req.testMiddleware, testMiddleware2: req.testMiddleware2 })
})

api.post('/test/:test', function(req,res) {
  res.status(200).json({ method: 'get', testMiddleware3: req.testMiddleware3, testMiddleware4: req.testMiddleware4, testMiddleware5: req.testMiddleware5 })
})

api.get('/testPromise', function(req,res) {
  res.status(200).json({ method: 'get', testMiddlewarePromise: req.testMiddlewarePromise })
})


api2.get('/test', function(req,res) {
  res.status(200).json({ method: 'get', middleware: req.testMiddleware ? true : false, middlewareWildcard: req.testMiddlewareWildcard ? true : false, middlewareParam: req.testMiddlewareParam ? true : false, middlewarePath: req.testMiddlewarePath ? true : false  })
})

api2.get('/test2/:test', function(req,res) {
  res.status(200).json({ method: 'get', middleware: req.testMiddleware ? true : false, middlewareWildcard: req.testMiddlewareWildcard ? true : false, middlewareParam: req.testMiddlewareParam ? true : false, middlewarePath: req.testMiddlewarePath ? true : false  })
})

api2.get('/test/xyz', function(req,res) {
  res.status(200).json({ method: 'get', middleware: req.testMiddleware ? true : false, middlewareWildcard: req.testMiddlewareWildcard ? true : false, middlewareParam: req.testMiddlewareParam ? true : false, middlewarePath: req.testMiddlewarePath ? true : false })
})

api2.get('/test/:param1', function(req,res) {
  res.status(200).json({ method: 'get', middleware: req.testMiddleware ? true : false, middlewareWildcard: req.testMiddlewareWildcard ? true : false, middlewareParam: req.testMiddlewareParam ? true : false, middlewarePath: req.testMiddlewarePath ? true : false })
})


api3.get('/test', function(req,res) {
  res.status(200).json({ method: 'get', middleware: req.testMiddlewareAll ? true : false })
})

api3.get('/test/:param1', function(req,res) {
  res.status(200).json({ method: 'get', middleware: req.testMiddlewareAll ? true : false })
})

api3.get('/test2/test', function(req,res) {
  res.status(200).json({ method: 'get', middleware: req.testMiddlewareAll ? true : false })
})

api3.get('/test3', function(req,res) {
  res.status(200).json({ method: 'get', middleware: req.testMiddlewareAll ? true : false })
})

/******************************************************************************/
/***  BEGIN TESTS                                                           ***/
/******************************************************************************/

describe('Middleware Tests:', function() {

  this.slow(300);

  it('Set Values in res object', async function() {
    let _event = Object.assign({},event,{})
    let result = await new Promise(r => api.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","testMiddleware":"123","testMiddleware2":"456"}', isBase64Encoded: false })
  }) // end it

  it('Access params, querystring, and body values', async function() {
    let _event = Object.assign({},event,{ httpMethod: 'post', path: '/test/123', queryStringParameters: { test: "456" }, body: { test: "789" } })
    let result = await new Promise(r => api.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","testMiddleware3":"123","testMiddleware4":"456","testMiddleware5":"789"}', isBase64Encoded: false })
  }) // end it


  it('Middleware with Promise/Delay', async function() {
    let _event = Object.assign({},event,{ path: '/testPromise'})
    let result = await new Promise(r => api.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","testMiddlewarePromise":"test"}', isBase64Encoded: false })
  }) // end it


  it('With matching string path', async function() {
    let _event = Object.assign({},event,{ path: '/test' })
    let result = await new Promise(r => api2.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","middleware":true,"middlewareWildcard":false,"middlewareParam":false,"middlewarePath":false}', isBase64Encoded: false })
  }) // end it

  it('With non-matching string path', async function() {
    let _event = Object.assign({},event,{ path: '/test2/xyz' })
    let result = await new Promise(r => api2.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","middleware":false,"middlewareWildcard":false,"middlewareParam":false,"middlewarePath":false}', isBase64Encoded: false })
  }) // end it

  it('Wildcard match', async function() {
    let _event = Object.assign({},event,{ path: '/test/xyz' })
    let result = await new Promise(r => api2.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","middleware":false,"middlewareWildcard":true,"middlewareParam":false,"middlewarePath":false}', isBase64Encoded: false })
  }) // end it

  it('Parameter match', async function() {
    let _event = Object.assign({},event,{ path: '/test/testing' })
    let result = await new Promise(r => api2.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","middleware":false,"middlewareWildcard":true,"middlewareParam":true,"middlewarePath":true}', isBase64Encoded: false })
  }) // end it



  it('Matching path (array)', async function() {
    let _event = Object.assign({},event,{ path: '/test' })
    let result = await new Promise(r => api3.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","middleware":true}', isBase64Encoded: false })
  }) // end it

  it('Matching param (array)', async function() {
    let _event = Object.assign({},event,{ path: '/test/xyz' })
    let result = await new Promise(r => api3.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","middleware":true}', isBase64Encoded: false })
  }) // end it

  it('Matching wildcard (array)', async function() {
    let _event = Object.assign({},event,{ path: '/test2/test' })
    let result = await new Promise(r => api3.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","middleware":true}', isBase64Encoded: false })
  }) // end it

  it('Non-matching path (array)', async function() {
    let _event = Object.assign({},event,{ path: '/test3' })
    let result = await new Promise(r => api3.run(_event,{},(e,res) => { r(res) }))
    expect(result).to.deep.equal({ headers: { 'content-type': 'application/json' }, statusCode: 200, body: '{"method":"get","middleware":false}', isBase64Encoded: false })
  }) // end it


}) // end MIDDLEWARE tests
