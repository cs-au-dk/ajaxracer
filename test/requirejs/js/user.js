define([], function () {
  function User() {
    var name = 'Steven';

    this.getName = function () {
      return name;
    };
  };

  return User;
});
