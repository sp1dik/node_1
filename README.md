# Practical Task 1 - Students Management System

In this Practical Task you will work with pure Node.js without any frameworks and external libraries.

You will practice work with Built-In Node.js modules and concept of modules themselves.

## Preparations

Here are some preparations to make sure you have everything you need to work with Node.js.

### Install Node.js

Make sure you have installed Node.js on your local machine.

To do that you need to visit [nodejs.org](https://nodejs.org/en) and click either "Get Node.js" button or go to "Download" section (see website header section). From there - follow the installation instructions.

_By default you will be proposed to install Long-Term Support (LTS) version of Node.js. You can proceed with it._

### Check that Node.js is installed

Make sure that Node.js and NPM are installed by checking their's current version. Run the following commands in your terminal:

```sh
node -v
```

```sh
npm -v
```

### Initialize your first package

Before you start - you need to initialize your project with `package.json`.

Go to `pr-1/` directory and run `npm init`. Follow the instructions and specify project name and your name/nickname (_preferrably_).

## Tasks

### 1. Working with Node.js CommonJS modules

In `task/` directory you can find `index.js` file.

This file contains some class and methods which needs to be logically organized into a smaller pieces. To achieve that you need to use the concept of modules in Node.js.

At the moment you don't need to immediately implement all these methods. Just to split the code into a separate files.

You are free to collect methods into classes and export them as you like. Yet, it would be nice to make these separations logical and semantically correct.

---

Useful links/Starting points:

- [Modules: CommonJS modules](https://nodejs.org/api/modules.html#modules-commonjs-modules)

---

### 2. Implement methods

All methods which were initially defined in `index.js` should be implemented.

### 3. Read-Write students from file

Your students need to be stored somewhere.

Right now - the better option would be to convert all your students into JSON format and then write them into `.json` file.

Read/Write file _should_ be implemented using standard Built-In `fs` module.

You need to implement `saveToJSON` and `loadJSON` methods which are initially stored in `index.js` file.

> NOTE: Placing new methods in the correct place in the project + documenting them will help you to get the higher mark.

In addition to implemented methods - implement the logic which will transform the loaded data from JSON file into an array of `Student` objects.

---

Useful links/Starting points:

- [`fs.writeFileSync`](https://nodejs.org/api/fs.html#fswritefilesyncfile-data-options)
- [`fs.readFileSync`](https://nodejs.org/api/fs.html#fsreadfilesyncpath-options)

---

### 4. Implement `Logger`

Cover your _Students Management System_ with logger which may help you to collect and display some additional data from your system.

#### Implement `log` method

Follow the instructions from `TODO` comment and adjust the method logic as expected.

To get the data from your operating system you can use built-in Node.js module - `os`.

Don't forget that `log` should work differently depending on the values you've passed to `Logger` constructor.

#### Specify `Logger` mode through CLI arguments

Sometimes we don't need to see the detailed logs as well as we don't need to display anything at all.

For that `Logger` constructor has `verbose` and `quiet` parameters.

To make our `Logger` more functional - implement reading CLI arguments from `process.argv`.

CLI arguments your program should expect:

- If `--verbose` is passed -> `Logger` should work in verbose mode.
- If `--quiet` is passed -> `Logger` should work in quiet mode.

Both of these arguments are optional.

#### Integrate `Logger` into your main logic

Replace all default `console.logs` with your `Logger.log` method.

## Theoretical Questions

Questions are based on information given in lections.

1. What is Node.js?
2. What are the benefits of Node.js?
3. How libuv and V8 are related to Node.js?
4. What are the differences between Node.js and Web Browser?
5. What is npm? Why do we need it?
6. What are the alternatives to npm?
7. How can you read arguments which were passed through CLI to your script?
8. Explain how to work with CommonJS modules. Import/Export.
9. Is it possible to execute your `.js` script without calling `node`? If yes - how?
10. What is the core difference between CommonJS and ESM modules?
11. Which functionality provides built-in `fs` module?
12. Which functionality provides built-in `os` module?
13. Which functionality provides built-in `path` module?

## Evaluation Criteria

### Practical Part

- Task 1 - **1 pt**
- Task 2 - **1.5 pts**
- Task 3 - **2 pts**
- Task 4 - **2.5 pts**

In Total: **7 pts**

### Theoretical Part

You should expect 3 questions. Each question you answered well is **+1 pt**.

### Final Mark

**Practical part** (max 7 pts) + **Theoretical Part** (max 3 pts) = 10.
