# Remix

[![Join the chat at https://gitter.im/ethereum/remix](https://badges.gitter.im/ethereum/remix.svg)](https://gitter.im/ethereum/remix?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Ethereum tools for the web.

*Are you looking for the Remix IDE? Follow [this link](https://github.com/ethereum/browser-solidity)!*

+ [What is Remix?](#what-is-remix)
+ [How to use Remix](#how-to-use)
+ [Modules](#modules)
+ [Contributing](#contributing)

## <a name="what-is-remix"></a>What is Remix?

**Remix** is a suite of tools to interact with the Ethereum blockchain in order to debug transactions, stored in this Git repository. A Remix transaction Web debugger is available [here](http://ethereum.github.io/remix), and its source code is part of this repository.

The **Remix IDE** is an IDE for Solidity dApp developers, powered by Remix. The Remix IDE repository **is available [here](https://github.com/ethereum/browser-solidity)**, and an online version is available at https://remix.ethereum.org.

## <a name="how-to-use"></a>How to use Remix

### Prerequisites

To use Remix tools, you'll need to connect to an Ethereum node. You can do that using [the Mist browser](https://github.com/ethereum/mist), or by connecting to your local Ethereum node (`geth`, or `eth`). *Note: connecting to `geth` does not work through https.*

+ Using `geth`: `geth --rpc --rpcapi 'web3,eth,debug' --rpcport 8545 --rpccorsdomain '*'`.

+ Using `eth`: `eth -j --rpccorsdomain '*'`

**DO NOT DO EXECUTE THESE COMMANDS IF `geth`/`eth` STORES YOUR PRIVATE KEYS**, as any external system might be able to access your node's RPC server!

Those commands will run the RPC server on `localhost:8545`, which is the default URL that Remix will connect to. This instance should **only** be used for debugging purposes. Never use features that could have an impact on your keys: do not unlock any keys, do not use this instance together with the wallet, do not activate the admin `web3` API.

### Run the debugger

See [here](remix-debugger/README.md) how to install, run and use the debugger locally.

## <a name="modules"></a>Remix Modules

Remix is built out of 4 different modules:

+ [`remix-solidity`](remix-solidity/README.md) provides Solidity analysis and decoding functions.
+ [`remix-lib`](remix-lib/README.md)
+ [`remix-core`](remix-core/README.md) is a utility package, providing high-level abstractions to work with the Ethereum VM.
+ [`remix-debugger`](remix-debugger/README.md) contains the **debugging webapp**.

## Contributing

Everyone is very welcome to contribute on the codebase of Remix. Please reach us in [Gitter](https://gitter.im/ethereum/remix).

For more information on the contributing procedure, see [CONTRIBUTING.md](CONTRIBUTING.md). For more information on running and developing the Remix debugger, see [the debugger README.md](remix-debugging/README.md).
