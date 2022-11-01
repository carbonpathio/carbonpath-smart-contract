## Initialize

```bash
yarn
```

## Run lint checker

```bash
yarn lint
```


## Compile Contracts

```bash
yarn compile
```

## Testing Contracts

```bash
yarn test
```

## Deploying Contracts


### Public (Celo)

Make sure to set the MNEMONIC_CELO in .env, this is the `Recovery Phrase` in your celo wallet.

For deploying in Alfajores testnet:

```bash
yarn deploy alfajores
```

For deploying in Celo mainnet:

```bash
yarn deploy celo
```

## Interacting from a console

You can open the hardhat console by using (depending on where you deployed the contract):

```bash
npx hardhat console --network <alfajores/celo>
```

Make sure that the contract is deployed. A useful guide in using the console can be found here: https://docs.openzeppelin.com/learn/deploying-and-interacting#interacting-from-the-console

