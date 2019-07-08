
/* 
 1. fs.stat  检测是文件还是目录(目录 文件是否存在) 
 2. fs.mkdir  创建目录 （创建之前先判断是否存在） 
 3. fs.writeFile  写入文件(文件不存在就创建,但不能创建目录) 
 4. fs.appendFile 写入追加文件 
 5.fs.readFile 读取文件 
 6.fs.readdir 读取目录 
 7.fs.rename 重命名 
 8. fs.rmdir  删除目录 
 9. fs.unlink 删除文件 
*/

let fs = require('fs')
// let fse = require('fs-extra')
let jsmediatags = require('jsmediatags/dist/jsmediatags.min')
let events = require('events')

// let rootDirBase = "D:/Code/test/music"  // 源dir
// let targetDirBase = "D:/Code/test/target" // 目标dir

let rootDirBase = "D:/musicWorks/Music_Repo"  // 源dir
let targetDirBase = "D:/musicWorks/music_temp" // 目标dir

let errorInfo = []  // 错误信息
let errorFile = []  // 创建文件出错
let log = []  // 操作日志
let otherFomat = [] // 检查其他格式音乐
const logName = ['log','errorInfo','errorFile', 'otherFomat']

// orderMusicByDir(rootDirBase,targetDirBase)
// 监听文件写入
let writeEvent = new events.EventEmitter()



let writeDelay
// writeEvent.on('writeFile', () => {
//   clearTimeout(writeDelay)
//   writeDelay = setTimeout(() => {
//     // 导出日志信息
//     [log, errorInfo, errorFile, otherFomat].forEach((item, index) => {
//       let logDate = new Date()
//       let logTime = logDate.getFullYear()+' '+logDate.getMonth()+' '+logDate.getHours()+' '+logDate.getMinutes()
//       fs.writeFile(`${targetDirBase}/_${logName[index]}${logTime}.json/`, JSON.stringify(item),(err) => {
//         if(err) {
//           console.log(err)
//         }
//       })
//     })
//   }, 10000)
// })
// returnAlbumDir("D:/Code/test/music/test.mp3")

/* ----- ===== ----- */
/*        方法        */

export function orderMusicByDir(root, targetBase) {
// 递归拿到多极目录下的波形文件，赋值给musicList
  fs.readdir(root, function(err, files) {
    if(err) {
      console.log(err)
    } else {
      files.forEach(item => {
        let rootDir = root + "/" +item
        fs.stat(rootDir, function(err, stats) {
          if(stats.isDirectory()) {
            // 递归
            orderMusicByDir(rootDir, targetDirBase)
          } else {
            // 读取歌曲信息,并创建文件夹
            returnAlbumDir(rootDir, targetBase)
          }
        })
      })
    }
  })
}

// 获取歌曲信息并返回专辑文件夹路径点字符串
function returnAlbumDir(fileDir, targetBase) {
  if(fileDir.split('.').pop().toLowerCase() === 'mp3') {
    fs.readFile(fileDir, (err, data) => {
      if(err) {
        console.log(err)
      } else {
        new jsmediatags.Reader(data)
          .setTagsToRead(["title", "artist","album","track"])
          .read({
            onSuccess (tag) {
              if(tag.tags.artist && tag.tags.album && tag.tags.track) {
                let targetName = `${tag.tags.artist} - ${tag.tags.album}`
                let targetDir = `${targetBase}/${targetName}`
                // console.log(JSON.stringify(tag.tags))
                // 创建目标目录
                createAlbumDir(targetDir)
                  .then(() => {
                    writeMusicFile(data, `${targetDir}/${trackCheck(tag.tags, fileDir)}`)
                  },
                  () => {
                    console.log(`无法创建：${targetDir}/${fileDir.split('/').pop()}`)
                    log.push(`无法创建：${targetDir}/${fileDir.split('/').pop()}`)
                    errorInfo.push(`无法创建：${targetDir}/${fileDir.split('/').pop()}`)
                  }
                  )
              } else {  // 如果没有ID3信息
                createAlbumDir(`${targetBase}/0`)
                  .then(() => {
                    writeMusicFile(data, `${targetBase}/0/${fileDir.split('/').pop()}`)
                  }, () => {
                    console.log(`无法创建：${targetBase}/0/${fileDir.split('/').pop()}`)
                    log.push(`无法创建：${targetBase}/0/${fileDir.split('/').pop()}`)
                    errorInfo.push(`无法创建：${targetBase}/0/${fileDir.split('/').pop()}`)
                  })
              }
            },
            onError (error) {
              console.log(':(', error.type, error.info);
              console.log(fileDir)
            }
          });
      }
    })
  } else {
    // 其他格式
    console.log('otherFmoat: ',fileDir)
    otherFomat.push(fileDir)
  }
} 

// 创建新的专辑目录
function createAlbumDir(targetDir) {
  return new Promise((resolve, reject) => {
    fs.mkdir(targetDir, function(err) {
      if(err) {
        if(err.toString().indexOf('Error: EEXIST: file already exists') !== -1) {
          // 当前目录存在
          console.log(`存在当前目录：${targetDir}`)
          log.push(`存在当前目录：${targetDir}`)
          resolve()
        } else if(err.toString().indexOf('Error: ENOENT: no such file or directory') !== -1) {
          // 如果没有父级目录，就创建父级目录
          let childDirArr = targetDir.split('/')
          let lastNode = `/${childDirArr[childDirArr.length - 1]}`
          let parentDir = targetDir.replace(lastNode,'')
          // 创建父节点
          createAlbumDir(parentDir)
            .then(() => {
              // 创建节点
              createAlbumDir(targetDir)
              resolve()
            })
        } else {
          console.log(`创建目录出错：${targetDir}`)
          log.push(`创建目录出错：${targetDir}`)
          errorInfo.push(`创建目录出错：${targetDir}`)
          reject()
        }
      } else {
        console.log(`创建：${targetDir}`)
        log.push(`创建：${targetDir}`)
        resolve()
      }
    })
  })
}

// 写入文件到目标路径
function writeMusicFile(data, targetDir) {
  fs.writeFile(targetDir, data, {flag: 'wx'}, (err) => {
    if(err) {
      console.log(err, targetDir)
      errorFile.push(err, targetDir)
    } else {
      console.log(`创建文件：${targetDir}`)
      log.push(`创建文件：${targetDir}`)
    }
  })
  writeEvent.emit('writeFile')
}

// 检查track编号和title
function trackCheck(tags, fileDir) {
  let track = tags.track, name
  if(tags.title) {
    name = tags.title
    if(tags.track.indexOf('/') !== -1) {
      track = track.split('/')[0]
    }
    if(track.length === 1) {
      track = `0${track}`
    }
    return `${track} ${name.replace(/[\?\*\\\/\:\"\|\<\>]/g,'')}.${fileDir.split('.').pop()}`
  } else {
    if(tags.track.indexOf('/') !== -1) {
      track = track.split('/')[0]
    }
    if(track.length === 1) {
      track = `0${track}`
    }
    if(fileDir.split('/').pop().indexOf(track) !== -1) {
      return fileDir.split('/').pop()
    } else {
      // console.log('name:',fileDir.split('.').pop().replace(/[\?\*\\\/\:\"\|\<\>]/g,''))
      return `${track} ${fileDir.split('/').pop()}`
    }
  }
}
