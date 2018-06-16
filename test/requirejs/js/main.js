require.config({
  paths: {
    'jQuery': 'jquery-3.3.1'
  },
  shim: {
    'jQuery': {
      exports: '$'
    }
  }
});

require(['user', 'blog/post'], function(u, p){
  var user = new u();
  var post = new p();
  post.makePost("Hello world!");
});
