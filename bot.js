const Discord = require('discord.js');
const Sequelize = require('sequelize');
const Canvas = require('canvas');
const { CITEXT } = require('sequelize');
const { createContext } = require('vm');
const client = new Discord.Client();
const PREFIX = "+";

const SecretWord = 'test';

const sequelize = new Sequelize('database', 'user', 'passsword', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: true,
    // SQLite only
    // This is for an RPI, use an absolute path.
    // Otherwise it won't find the database if you use pm2.
    storage: '/home/pi/DiscordBot/database.sqlite'
    }
);

/* 
 * equivalent to: CREATE TABLE tags(
 * name VARCHAR(255),
 * description TEXT,
 * username VARCHAAR(255),
 * usage INT
 * );
 */
const Tags = sequelize.define('tags', {
	name: {
		type: Sequelize.STRING,
		unique: true,
	},
	description: Sequelize.TEXT,
	username: Sequelize.STRING,
	usage_count: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
});

const Reacts = sequelize.define('reacts', {
	name: {
		type: Sequelize.STRING,
		unique: true,
	},
	description: Sequelize.TEXT,
	username: Sequelize.STRING,
	usage_count: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
});


// This only needs to be on when it's first initialized.
// I ran into issues with the sync clearing the database on hard resets
//client.once('ready', () => {
// Reacts.sync();
// Tags.sync();
//})

client.on('ready', () => {

    client.user.setActivity("with my butt.", {type: "PLAYING"});
    console.log("Connected as " + client.user.tag);
    //List the servers the bot is connected to
    console.log("Servers:");
    client.guilds.cache.forEach((guild) => {
        console.log(" - " + guild.name);
        // List all channels
        guild.channels.cache.forEach((channel) => {
            console.log(` -- ${channel.name} (${channel.type}) - ${channel.id}`);
        })
    })

    //Set a channel
    var generalChannel = client.channels.cache.get("753117761084981319");
    //Send a message
    generalChannel.send("I just got restarted. What'd I miss?");
    //Attachments:
    // Provide a path to a local file   
    // const localFileAttachment = new Discord.MessageAttachment('D:\\logo.png');
    // generalChannel.send(localFileAttachment);

})
//listens and responds
client.on('message', async (receivedMessage) => {
    var messageLower = receivedMessage.content.toLowerCase();
    var message = receivedMessage;
    //Prevent bot from responding to its' own messages
    if (receivedMessage.author == client.user) {
        return;
    }
    if(message.author.bot) {
        return;
    }
    if (messageLower.startsWith(PREFIX)) {
        const input = receivedMessage.content.slice(PREFIX.length).trim().split(' ');
        const command = input.shift();
        const commandArgs = input.join(' ');
        if (command === 'addtag') {
            // [delta]
            const splitArgs = commandArgs.split(' ');
            const tagName = splitArgs.shift().toLowerCase();
            const tagDescription = splitArgs.join(' ');

            try{
                // equivalent to: INSERT INTO tage (name, description, username) values (?, ?, ?);
                const tag = await Tags.create({
                    name: tagName,
                    description: tagDescription,
                    username: message.author.username,
                });
                return message.reply(`Tag ${tag.name} added.`);
            }
            catch (e) {
                if (e.name === 'SequalizeUniqueConstraintError') {
                    return message.reply('That tag already exists.');
                }
                return message.reply('Something went wrong with adding a tag.');
            }
        } else if (command === 'addreact') {
            // [delta]
            const splitArgs = commandArgs.split(' ');
            const reactName = splitArgs.shift().toLowerCase();
            const reactDescriptionIn = splitArgs.join(' ');
            const reactDescriptionS1 = reactDescriptionIn.split(':');
            const reactDescriptionS2 = reactDescriptionS1.pop();
            const reactDescription = reactDescriptionS2.substring(0, reactDescriptionS2.length - 1);

            try{
                // equivalent to: INSERT INTO tage (name, description, username) values (?, ?, ?);
                const react = await Reacts.create({
                    name: reactName,
                    description: reactDescription,
                    username: message.author.username,
                });
                return message.reply(`React ${react.name} added.`);
            }
            catch (e) {
                if (e.name === 'SequalizeUniqueConstraintError') {
                    return message.reply('That react already exists.');
                }
                return message.reply('Something went wrong with adding a tag.');
            }
        } else if (command === 'tag') {
            // [epsilon]
            const tagName = commandArgs;

            // equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
            const tag = await Tags.findOne({ where: { name: tagName } });
            if (tag) {
                // equivalent to: UPDATE tags SET usage_count = usage_count + 1 WHERE name = 'tagName';
                tag.increment('usage_count');
                return message.channel.send(tag.get('description'));
            }
            return message.reply(`Could not find tag: ${tagName}`);            
        } else if (command === 'edittag') {
            // [zeta]
            const splitArgs = commandArgs.split(' ');
            const tagName = splitArgs.shift();
            const tagDescription = splitArgs.join(' ');

            // equivalent to: UPDATE tags (description) values (?) WHERE name='?';
            const affectedRows = await Tags.update({ description: tagDescription }, { where: { name: tagName } });
            if (affectedRows > 0) {
                return message.reply('Tag ${tagName} was edited.');
            }
            return message.reply(`Could not find a tag with name ${tagName}.`);
        } else if (command === 'taginfo') {
            // [theta]
            const tagName = commandArgs;

            // equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
            const tag = await Tags.findOne({ where: { name: tagName } });
            if (tag) {
                return message.channel.send(`${tagName} was created by ${tag.username} at ${tag.createdAt} and has been used ${tag.usage_count} times`);
            }
            return message.reply(`Could not find tag: ${tagName}`);
        } else if (command === 'showtags') {
            // [lambda]
            // equivalent to: SELECT name FROM tags;
            const tagList = await Tags.findAll({ attributes: ['name'] });
            const tagString = tagList.map(t => t.name).join(', ') || 'No tags set.';
            return message.channel.send(`List of tags: ${tagString}`);
        } else if (command === 'removetag') {
            // [mu]
            const tagName = commandArgs;
            // equivalent to: DELETE from tags WHERE name = ?;
            const rowCount = await Tags.destroy({ where: { name: tagName } });
            if (!rowCount) return message.reply('That tag did not exist.');

            return message.reply('Tag deleted.');
        } else if (command === 'help'){
            return message.channel.send("```Prefix is set to: + \n\n\nAvailable commands:\n\n1) addtag <keyword> <response>\n----Creates a custom bot response. I am always listening.\n\n2) tag\n----Manually posts a tag response, pretty useless, but exists.\n\n3) edittag <keyword> <response>\n----Allows you to edit a tag\n\n4) showtags\n----Lists all of the tags, this shit could get verbose, so try to use this only in the kindergarden.\n\n5) removetag <keyword>\n----This removes the tag entirely, might become staff locked eventually.\n\n6) addreact <keyword> <ONE emote>\n----Creates a custom bot response for an emote. When I see a word in a message, I react to it with the emote I know.\n\n7) showreacts\n----Lists all of the reaction tags, this shit could get verbose, so try to use this only in the kindergarden.\n\n8) removereact <keyword>\n----This removes the reaction tag entirely, might become staff locked eventually.```")
        } else if (command === 'showreacts'){
            const reactList = await Reacts.findAll({ attributes: ['name'] });
            const reactString = reactList.map(t => t.name).join(', ') || 'No reacts set.';
            return message.channel.send(`List of reacts: ${reactString}`);
        } else if (command === 'removereact'){
             // [mu]
            const reactName = commandArgs;
            // equivalent to: DELETE from tags WHERE name = ?;
            const rowCount = await Reacts.destroy({ where: { name: reactName } });
            if (!rowCount) return message.reply('That react did not exist.');
            
            return message.reply('react deleted.');
        }else {
            console.log('Lol no command given.');
        }
    }
    const inputx = receivedMessage.content.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        // this is just because i thought it was funny, i'll be honest.
	// the basic tags can't provide images, but custom commands can.
	// if you want to add in more image responses, they can be written in just by copying this block.
    if (messageLower.includes("dickbutt")) {
    // Provide a URL to a file
    // I should just store this locally.
    const webAttachment = new Discord.MessageAttachment('https://external-content.duckduckgo.com/iu/?u=http%3A%2F%2Fstyfelife.com%2Fwp-content%2Fuploads%2F2016%2F10%2Fdickbutt.png&f=1&nofb=1', "dickbuttlol.png");
    receivedMessage.channel.send(webAttachment);
    console.log(`Sent a dickbutt to ` + receivedMessage.channel.name.toString());
    }

    if (inputx.includes("how ya doin sgb")) {
        message.channel.send("SKREE-ONK");
        console.log(`Dumb requested phrase sent to: ` + receivedMessage.channel.name.toString());
        }


    // this is the part that parses every single message.
    if (receivedMessage) {
	// converts text to lowercase and removes punctuation and markup
	// this prevents keywords from being missed in the event that they are proceeded by a period or question mark
        const input = receivedMessage.content.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
	// this splits the message content into an array, where each word is its' own item in the array
        var commandArgs = input.split(' ');
        console.log('INPUT IS: ' + commandArgs + ' | Length is: ' + commandArgs.length);
        let i=0;
	// this gathers the length of the array and sets it to a variable (simplifies comparison)
        var end = commandArgs.length;
        // begins a loop through the array
        do {
            console.log('i = ' + i);
            const tagName = commandArgs[i];

            // equivalent to: SELECT * FROM tags WHERE name = 'tagName' LIMIT 1;
            const tag = await Tags.findOne({ where: { name: tagName } });
            if (tag) {
                // equivalent to: UPDATE tags SET usage_count = usage_count + 1 WHERE name = 'tagName';
                tag.increment('usage_count');
                message.channel.send(tag.get('description'));
            }
            else{
                console.log(`Could not find tag: ${tagName}`);
            }
            i++;
        } while (i < end);
    }       

    //Reaction DB test
    if (receivedMessage) {
            const input = receivedMessage.content.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            var commandArgs = input.split(' ');
            console.log('INPUT IS: ' + commandArgs + ' | Length is: ' + commandArgs.length);
            let i=0;
            var end = commandArgs.length;
            do {
                console.log('i = ' + i);
                const reactName = commandArgs[i];
    
                const react = await Reacts.findOne({ where: { name: reactName } });
                if (react) {
                    react.increment('usage_count');
                    console.log(`Posted: ` + react.get('description') + ` as reaction`);
                    receivedMessage.react(react.get('description'));

                }
                else{
                    console.log(`Could not find react: ${reactName}`);
                }
                i++;
            } while (i < end);
        }       
    
})



//Get your bot's secret token from:
// https://discordapp.com/developers/applications/
// Click on your application -> Bot -> Token -> "Click hto reveal token"
bot_secret_token = "";

client.login(bot_secret_token);
