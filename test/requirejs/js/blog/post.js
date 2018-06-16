define(['user', 'jQuery'], function (u, $) {
  // load in user module
  var user = new u();

  function Post() {
    var name = user.getName();

    this.makePost = function (message) {
      $('#container').html(
        name + ": " + message + " (posted at " + new Date() + ")");
    };
  }

  return Post;
});
