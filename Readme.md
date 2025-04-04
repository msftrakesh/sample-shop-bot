npm install axios dotenv fs
npm run build

# clean build
Remove-Item -Recurse -Force dist
# OR
# first install npm install --save-dev rimraf, then
npx rimraf dist
# OR
npm run clean

# Test using Bot Framework Emulator
https://github.com/microsoft/BotFramework-Emulator

# download
https://github.com/microsoft/BotFramework-Emulator/releases