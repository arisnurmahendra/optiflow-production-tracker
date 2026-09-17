const fs = require('fs');
const content = fs.readFileSync('src/App.vue', 'utf8');

const matches = content.match(/<article[^>]*class="[^"]*card[^"]*"[^>]*>/g);
if(matches) {
  console.log(matches.join('\n'));
}

const titles = content.match(/<h3[^>]*>.*?<\/h3>/g);
if(titles) {
  console.log(titles.join('\n'));
}

const labels = content.match(/<[^>]*class="[^"]*task-card[^"]*"[^>]*>.*?<\/[^>]*>/gs);
if(labels) {
    console.log("task-card found");
}

