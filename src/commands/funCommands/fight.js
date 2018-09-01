const { GenericCommand } = require('../../models/')
module.exports = new GenericCommand(
  async ({ Memer, msg }) => {
    let author = msg.author
    let enemy = msg.args.resolveUser()
    if (!enemy) {
      return 'you need to provide a valid user ID or name to fight against'
    }
    if (enemy.id === author.id) {
      return 'You can\'t fight urself dumbo'
    }
    if (enemy.bot) {
      return 'You can\'t fight against bots, you\'ll never heard back from them'
    }
    enemy.health = author.health = 100
    enemy.armor = author.armor = 0
    let turn = author
    let oppturn = enemy

    const performTurn = async (attacker, opponent, retry) => {
      msg.channel.createMessage(`${turn.mention}, what do you want to do? \`punch\`, \`defend\` or \`end\`?\nType your choice out in chat as it's displayed!`)
      let prompt = await Memer.MessageCollector.awaitMessage(msg.channel.id, attacker.id, 30e3)
      if (!prompt) {
        msg.channel.createMessage(`${attacker.username} didn't answer in time`)
      } else if (prompt.content.toLowerCase() === 'punch') {
        let critChance = Math.random() >= 0.75 // 25% chance
        let damage = Math.floor((Math.random() * 100) * (critChance ? 2 : 1))

        opponent.health -= (damage - opponent.armor) < 0 ? 0 : (damage - opponent.armor)
        return damage
      } else if (prompt.content.toLowerCase() === 'defend') {
        let critChance = Math.random() >= 0.75 // 25% chance
        let defense = Math.floor((Math.random() * 25) * (critChance ? 2 : 1))

        if (attacker.armor < 50) {
          attacker.armor += defense
          msg.channel.createMessage(`**${attacker.username}** increased their armor by **${defense}**!`)
        } else {
          msg.channel.createMessage('don\'t be greedy ur already at the max armor level')
        }
        return false
      } else if (prompt.content.toLowerCase() === 'end') {
        msg.channel.createMessage(`**${attacker.username}** has ended the game`)
      } else {
        msg.channel.createMessage(`That's not a valid option! You must type \`punch\`, \`defend\` or \`end\` in chat!\n${retry ? 'The game has ended due to multiple invalid choices.' : ''}`)
        if (!retry) {
          return performTurn(attacker, opponent, true)
        }
      }
    }

    const play = async () => {
      const damage = await performTurn(turn, oppturn)
      if (damage === undefined) {
        return
      }
      if (!damage) {
        oppturn = [turn, turn = oppturn][0]
        return play()
      }
      const adjective = Memer.randomInArray(['an incredible', 'a dank', 'a l33t', 'a game-ending', 'an amazing', 'a dangerous', 'a painful', 'a CrAzY'])
      msg.channel.createMessage(`**${turn.username}** lands ${adjective} hit on **${oppturn.username}** dealing **${damage}**!\n**${oppturn.username}** is left with ${oppturn.health < 0 ? 0 : oppturn.health} health!`)
      if (turn.health > 1 && oppturn.health > 1) {
        oppturn = [turn, turn = oppturn][0]
        return play()
      } else {
        const loser = turn.health > 1 ? oppturn : turn
        const winner = loser === turn ? oppturn : turn
        loser.health = 0

        // Random words to SPICE up the winning message
        const wowword = Memer.randomInArray(['Holy heck!', 'Wow!', 'I did not expect that!', 'Like it or hate it,', 'YES!', 'This is so sad!', 'very good', 'Dang!'])
        const noun = Memer.randomInArray(['just', 'totally', 'heckin', '100%', 'absolutely', 'fricken', 'legitimately', 'completely'])
        const verb = Memer.randomInArray(['rekt', 'beaned', 'memed', 'destroyed', 'hecked', 'ruined', 'bamboozled', 'roasted'])
        msg.channel.createMessage(`${wowword} **${winner.username}** ${noun} ${verb} **${loser.username}**, winning with just \`${winner.health} HP\` left!`)
      }
    }
    play()
  },
  {
    triggers: ['fight', 'challenge'],
    usage: '{command} [user]',
    description: 'Fight to the death!'
  }
)
