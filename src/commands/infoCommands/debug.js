const os = require('os')
const { GenericCommand } = require('../../models/')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)

const getCPUUsage = async () => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  let [timeUsed0, timeIdle0, timeUsed1, timeIdle1] = new Array(4).fill(0)

  const cpu0 = os.cpus()
  await sleep(1000)
  const cpu1 = os.cpus()

  for (const cpu of cpu1) {
    timeUsed1 += (
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys
    )
    timeIdle1 += cpu.times.idle
  }
  for (const cpu of cpu0) {
    timeUsed0 += (
      cpu.times.user +
      cpu.times.nice +
      cpu.times.sys
    )
    timeIdle0 += cpu.times.idle
  }

  const totalUsed = timeUsed1 - timeUsed0
  const totalIdle = timeIdle1 - timeIdle0
  return (totalUsed / (totalUsed + totalIdle)) * 100
}

module.exports = new GenericCommand(
  async ({ Memer, msg }) => {
    const stats = await Memer.db.getStats()
    const CPUUsage = await getCPUUsage()
    const gateway = await Memer.http.get(`https://discordapp.com/api/gateway/bot`, { headers: { 'Authorization': Memer.bot.token } })
    const scan = async () => {
      let cachedMessages = 0
      let cursor = '0'
      const keys = await Memer.redis.scanAsync(cursor, 'MATCH', 'msg-*', 'COUNT', '100')
      if (!keys) {
        throw keys
      }
      cursor = keys[0]
      cachedMessages += keys[1].length
      if (cursor === '0') {
        return cachedMessages
      } else {
        return scan()
      }
    }

    const formatted =
    `[GUILDS] ${stats.guilds}\n` +
    `  [Large] ${stats.largeGuilds}\n` +
    `  [Exclusive] ${stats.exclusiveGuilds}\n` +
    `[USERS] ${stats.users}\n` +
    `  [Average] ${(stats.users / stats.guilds).toFixed()}\n` +
    `[CACHED MESSAGES] ${await scan()}\n` +
    `[MEMORY] ${(stats.totalRam / 1000).toFixed(1)}/${(os.totalmem() / 1073741824).toFixed(1)}gb (${((stats.totalRam / 1000) / (os.totalmem() / 1073741824)).toFixed(1)}%)\n` +
    `  [System] ${((os.totalmem() - os.freemem()) / 1073741824).toFixed(1)}/${(os.totalmem() / 1073741824).toFixed(1)}gb (${(((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1)}%)\n` +
    `  [Cluster] ${(stats.totalRam / 1000).toFixed(1) / Memer.config.sharder.clusters}gb\n` +
    `[UPTIME] ${Memer.parseTime(process.uptime())}\n` +
    `  [System] ${Memer.parseTime(os.uptime())}\n` +
    `[CPU] ${CPUUsage.toFixed(1)}%\n` +
    `[CONNECTIONS REMAINING] ${gateway.body.session_start_limit.remaining}\n` +
    `  [TIME UNTIL RESET] ${Memer.parseTime(gateway.body.session_start_limit.reset_after / 1000)}\n` +
    `[SFX] ${(await exec('$(find /home/memer/Dank-Memer/src/assets/audio/custom/ -type f | wc -l)')).stdout}\n` +
    `  [Disk Space] ${(await exec('$(du -sh /home/memer/Dank-Memer/src/assets/audio/custom/ | cut -f1)')).stdout}`

    return '```ini\n' + formatted + '\n```'
  }, {
    triggers: ['debug'],
    cooldown: 1e4,
    description: 'Returns information and statistics about Dank Memer.',
    perms: ['embedLinks']
  }
)
