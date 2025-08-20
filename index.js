const express = require('express');
const bodyParser = require('body-parser');
const { Op } = require('sequelize');
const db = require('./models');

const app = express();

const gamesUrls = [
  'https://wizz-technical-test-dev.s3.eu-west-3.amazonaws.com/ios.top100.json',
  'https://wizz-technical-test-dev.s3.eu-west-3.amazonaws.com/android.top100.json',
];

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', (req, res) => db.Game.findAll()
  .then((games) => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then((game) => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});

app.post('/api/games/search', (req, res) => {
  const { name, platform } = req.body;
  if (!name && !platform) {
    return db.Game.findAll();
  }

  return db.Game.findAll({
    where: {
      name: {
        [Op.like]: `%${name}%`,
      },
      ...(platform && { platform }),
    },
  })
    .then((game) => res.send(game))
    .catch((err) => {
      console.log('***There was an error search a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.get('/api/games/populate', (req, res) => {
  const insertGameOnDB = async (games) => {
    await Promise.all(games.map((game) => db.Game.create({
      publisherId: game.publisher_id,
      name: game.name,
      platform: game.os,
      storeId: game.app_id,
      bundleId: game.bundle_id,
      appVersion: game.version,
      isPublished: !!game.publisher_id,
    })));
  };

  const fetchGamesFromS3 = async (url) => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const games = await response.json();

    insertGameOnDB(games.flat());
  };

  gamesUrls.map((game) => {
    fetchGamesFromS3(game);
  });

  return db.Game.findAll()
    .then((games) => res.send(games))
    .catch((err) => {
      console.log('There was an error querying games', JSON.stringify(err));
      return res.send(err);
    });
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
