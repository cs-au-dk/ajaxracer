var child_process = require('child_process');

function dot2png(data, timeout=10000) {
  return new Promise((resolve, reject) => {
    var dot = child_process.spawn('dot', ['-Tpng']);

    var buffers = [];
    dot.stdout.on('data', (data) => buffers.push(data));
    dot.stderr.on('data', (data) => console.log(`stderr: ${data}`));

    dot.on('close', (code) => resolve(Buffer.concat(buffers)));

    dot.stdin.setEncoding('utf-8');
    dot.stdin.write(data);
    dot.stdin.end();

    setTimeout(function () {
      dot.kill();
      resolve(null);
    }, timeout);
  });
}

module.exports = dot2png;
