# firebase

Firebase development environment to support microservices and FE nodes

Start emulators
`firebase emulators:start`

Test GitHub actions locally
1. Install [docker](https://www.docker.com/)
2. Install [act](https://github.com/nektos/act)
    - `choco install act-cli` for Windows
    - `brew install act` for MacOS
    - `curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash` for linux.
3. Set up local variables
    - Add file .secrets to the root of the project containing variables that will resolver by `${{ secrets.VARIABLE_NAME }}`
    - Add file .env to the root of the project containing variables that will resolver by `${{ env.VARIABLE_NAME }}`
    - Add file .vars to the root of the project containing variables that will resolver by `${{ vars.VARIABLE_NAME }}`
      - .vars file is not loaded automatically by act, add argument `--var-file .vars` to the act shell command
4. Testing workflows
    - Check [this article](https://www.freecodecamp.org/news/how-to-run-github-actions-locally/) for different use cases
    - Example for testing only the job build_and_deploy_functions: 
        - `act --job build_and_deploy_functions --var-file .vars --secret-file .secrets`
        - `act --job build_and_deploy --var-file .vars --secret-file .secrets`