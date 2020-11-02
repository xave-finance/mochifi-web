# Intro

The MochiFi wallet was built for the Terra hackathon in a span of 2 weeks and is considered as a Proof of Concept and not in any way production ready. The aim is to build a user friendly, non custodial wallet that removes the need for users having to store seed phrases or even remember passwords - much like https://argent.xyz on Ethereum.

# Mochifi MultiSig Wallet

The MochiFi wallet is a Terra based MultiSig Smart Contract wallet. The wallet's user keeps a Terra account (Externally Owned Account) on the browser's local storage. This account is set as the owner of the Smart Contract. User's funds are stored on the Smart Contract.

Typically non custodial wallets such as TrustWallet or Status require a user to write down a 12 word seed phrase due to the way wallets are derived from 12 word seed phrase mnemonic. This is not user friendly. Mochifi creates a self managed wallet without the need for seed phrases by introducing guardians.

_Mochifi is BigMochi's official entry to Terra Testnet Developer Contest._

## Smart Contract Documentation

[Smart Contract Document Link](https://docs.google.com/document/d/1HkHrV_avpu1f43tYQ_ZZLPVJEPgGKjlB4mKuElRxdtk/edit?usp=sharing)

### Compiling and uploading the smart contract code

- Note: Setup your environment first. Check out the Developing.md in the contract folder

1. Compile the rust contract to wasm

```
cargo wasm
```

2. Run the tests

```
cargo unit-tests
```

3. Generate schema

```
cargo schema
```

4. Run the rust optimizer tool

```
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/rust-optimizer:0.10.3
```

5. Check the mochifi_wallet.wasm file in the artifacts folder

6. Deploying in localterra or tequila testnet using TerraJs

```
    const terra = new LCDClient({
      URL: 'https://tequila-lcd.terra.dev',
      chainID: 'tequila-0004'
    })

    const mk = new MnemonicKey();

    // link to contract file
    const file = readFileSync(path.resolve(__dirname, "../src/[link-to-wasm-file]"));

    // wallet instance
    const wallet = terra.wallet(mk);

    // making the store code message
    const storeCode = new MsgStoreCode(
      wallet.key.accAddress,
      file.toString('base64'),
    )


    // declare fee if needed to proceed transaction
    const fee = new StdFee(2657235, { uluna: 398586 });

    const storeCodeTx = await wallet.createAndSignTx({
      msgs: [storeCode], fee
    });
   const storeCodeTxResult = await terra.tx.broadcast(storeCodeTx)

```

### Instantiating the contract code

- Note: The contract is uploaded in the tequila - 00004 testnet. Code Id is 139

- Using Terra.js

```
    const terra = new LCDClient({
      URL: 'https://tequila-lcd.terra.dev',
      chainID: 'tequila-0004'
    })

    const mk = new MnemonicKey();

    // wallet instance
    const wallet = terra.wallet(mk);

  // create contract instance
  const instantiateContract = new MsgInstantiateContract(
    wallet.key.accAddress, // owner
    139, // code ID
    {}, // InitMsg
    { uluna: 10000000 }, // init coins
    false // migratable
  )

    // declare fee if needed to proceed transaction
    const fee = new StdFee(2657235, { uluna: 398586 });

    const instantiateCodeTx = await wallet.createAndSignTx({
      msgs: [instantiateContract], fee
    });
    const instantiateCodeTxResult = await terra.tx.broadcast(instantiateCodeTx)
```

### Executing Contract Functions

- You can refer to the smart contract document for more information on the [smart contract functions](https://docs.google.com/document/d/1HkHrV_avpu1f43tYQ_ZZLPVJEPgGKjlB4mKuElRxdtk/edit?usp=sharing)

```

    const terra = new LCDClient({
      URL: 'https://tequila-lcd.terra.dev',
      chainID: 'tequila-0004'
    })

    const mk = new MnemonicKey();

    // wallet instance
    const wallet = terra.wallet(mk);

    // execute a contract function
    const execute = new MsgExecuteContract(
    wallet.key.accAddress, // sender
    'contract-address', // contract account address
    { send_tokens: { to_address: "receiver-address", amount: [{ denom: "uluna", amount: "1000000" }] } }, // handle msg
    {} // coins
     );

    // declare fee if needed to proceed transaction
    const fee = new StdFee(2657235, { uluna: 398586 });

    const executeCodeTx = await wallet.createAndSignTx({
      msgs: [execute], fee
    });
    const executeCodeTxResult = await terra.tx.broadcast(executeCodeTx)


```

## Web app installation

Ensure the correct node version is installed:

```bash
nvm install `cat .nvmrc`
```

Use `yarn` to install dependencies.

```bash
yarn install
```

## Run web app

```python
yarn start
```

## Demo

See [web app demo](https://drive.google.com/file/d/1lnxQa1RNBrqrJ1lx74f75lOl_ihMMa_7/view?usp=sharing)

Demonstrated features:

- Wallet account creation
- Send tokens to another account
- Add Guardians
- Multi-signature wallet recovery

A test version can also be accessed at [bigmochi-test.web.app](https://bigmochi-test.web.app)

## Security

The user wallet and other values saved in local storage is encrypted using `crypto-js`. The encryption secret is fetched from the server on app load and never stored persistently in the client side. -> We know this is not the decentralised and self sovereign way to store keypairs, but it was a workaround since webapps don't have secure enclaves and at the time we started, TerraJS was not playing nice w react native. 

## Challenges & workarounds

- The gas estimation fee seemed to be not working. All auto gas estimations fail both in `localterra` and the testnet. During the development process, we would check the gasUsed and the txn fee error message in the log of the response and include a `StdFeee` in broadcasting the transaction
- Lack of notification system where the app can subscribe and listen to blockchain events. We had to write app-level code using Firebase in able to achieve the real-time notifications.
- We are facing a blocked by CORS issue in `localterra` so we had to work with `tequila` testnet during the development process. There are a few times that the testnet becomes unreachable because of a HTTP 502 error resulting to downtime.
- Terra Station really helped us testing our contracts. The querying function is good but the interaction functionality isn't working and uploading the code doesnt return the code id.
- The logs sometimes are confusing since we still get a success message even if there is an internal error that happens in the blockchain side.
- An integrated subscription functionality to TerraJS that allows us to listen to blockchain events. In this project, we handled it using firebase (which is centralized).

# Future Work

## Limitations and Action Steps

- The identity keypair needs to manually be sent Luna for gas fees during wallet creation - in a production setup there would be a middle layer that manages wallet deployment and abstracts this from the user
- Guardian app needs to be opened in able to be notified of add guardian & wallet recovery requests otherwise there is no way to see the pending requests
- Remove guardian and cancel recovery functionalities are not shown in the app but is supported in the contract. Although it's current implementation needs to be improved in terms of security.
- All functions are verbose, we can refactor this further into internal functions to prepare it for production
- Guardian addresses are currently stored as string. We can improve it further receiving addresses as HumanAddr and store it as CanonicalAddr in state.
- To verify guardian addresses, we need to check first if the sender of the transaction is the owner of the smart contract wallet by doing cross contract querying. Currently, we just send the guardian address in every the handle functions.
- The key pair wallet addresses are currently stored in the local storage with encryption. We can improve this when we develop a mobile app version of this project where we would store identity keypairs in a mobile device's secure enclave for proper safekeeping much like (uPortSigner)[https://github.com/uport-project/react-native-uport-signer ]

## License

[MIT](https://choosealicense.com/licenses/mit/)
