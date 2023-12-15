import {exec} from 'child_process'
import {readFileSync, writeFileSync} from 'fs'
import {promisify} from 'util'

const execp = promisify(exec)

interface PackageInfo {
  value: string
  children: {
    Version: string
    [key: string]: string
  }
}
const main = async () => {
  const infoResult = await execp('yarn info --json')
  if (!infoResult.stdout) {
    throw new Error('No stdout')
  }
  let array = `${infoResult.stdout.split('\n').join(',')}`
  array = array.slice(0, array.length - 1)
  const infoContent = `{"result": [${array}]}`
  writeFileSync('./info.json', infoContent, 'utf8')
  const info = (JSON.parse(infoContent) as any).result as PackageInfo[]

  const currentVersions = info.reduce(
    (acc, curr) => ({...acc, [curr.value.split('@npm')[0]]: curr.children.Version}),
    {} as Record<string, string>
  )

  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8')) as any
  const newPackageJson = {...packageJson}
  const keys = ['dependencies', 'devDependencies']
  for (const key of keys) {
    for (const [name, version] of Object.entries(packageJson[key])) {
      const latestVersion = currentVersions[name]
      if(!latestVersion){
        console.log(`Skipping ${name}, no latestVersion to compare to`)
        continue
      }
      if (version !== latestVersion) {
        console.log(`Updating ${name} from ${version} to ${latestVersion}`)
        newPackageJson[key][name] = latestVersion
      }
    }
  }
  writeFileSync('./package.json', JSON.stringify(newPackageJson, null, 2), 'utf8')
  // console.log('New package.json', newPackageJson)
}

main()
