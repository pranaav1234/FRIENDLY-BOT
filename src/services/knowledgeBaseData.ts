import { KnowledgeTopic } from './localAiEngine';

export const OFFICIAL_KNOWLEDGE_BASE: KnowledgeTopic[] = [
  {
    id: 'java',
    name: 'Java Programming',
    category: 'Programming Languages',
    keywords: [
      'java', 'core java', 'advanced java', 'java programming', 'java language', 'jvm', 'jdk', 'jre', 
      'bytecode', 'class', 'object', 'constructor', 'inheritance', 'polymorphism', 'abstraction', 
      'encapsulation', 'interface', 'abstract class', 'collections', 'multithreading', 'exception handling', 
      'generics', 'streams', 'lambda', 'synchronization', 'serialization', 'annotations', 'garbage collection', 
      'memory management', 'jvm architecture', 'heap', 'stack', 'java 8', 'java 11', 'java 17', 'spring', 
      'maven', 'gradle', 'explain java', 'tell me about java', 'define java', 'what do you mean by java', 
      'java basics', 'java introduction', 'java overview', 'why java', 'features of java', 'advantages of java', 
      'java architecture', 'jvm explanation'
    ],
    simple: 'Java is a class-based, object-oriented, highly secure, and platform-independent programming language. It is powered by the "Write Once, Run Anywhere" (WORA) principle, achieved by compiling source code into platform-neutral bytecode that executes on any system running a Java Virtual Machine (JVM).',
    detailed: 'Java Programming Language:\n\n' +
      '• Definition: A general-purpose, concurrent, class-based, and object-oriented programming language designed to have as few implementation dependencies as possible.\n' +
      '• History: Developed by James Gosling at Sun Microsystems and released in 1995. Now owned by Oracle Corporation.\n' +
      '• Features: Platform Independent, Robust, Secure, Object-Oriented, Multithreaded, Architecture-Neutral, High Performance (via JIT compiler).\n' +
      '• Architecture: Consists of JDK (Java Development Kit, containing compiler and development tools), JRE (Java Runtime Environment, providing library classes and resources), and JVM (Java Virtual Machine, executing the bytecode).\n' +
      '• OOP Pillars: Encapsulation (hiding data using private variables and public getters/setters), Abstraction (using abstract classes and interfaces), Inheritance (extending properties via "extends"), and Polymorphism (method overloading and overriding).\n' +
      '• Collections Framework: Provides readymade structures like ArrayList, LinkedList, HashMap, HashSet, and TreeMap.\n' +
      '• Exception Handling: Robust handling using try, catch, finally, throw, and throws blocks with checked and unchecked exceptions.\n' +
      '• Concurrency: Built-in support for multithreading using the Thread class, Runnable interface, and Executor framework.\n' +
      '• Memory Management: Managed automatically using stack memory (for local variables and method execution frames) and heap memory (for dynamic object allocations), periodically cleared by the automatic Garbage Collector.',
    analysis: 'Deep Technical Analysis & Interview Prep (Java):\n\n' +
      '1. JVM Internal Architecture:\n' +
      '   - ClassLoader Subsystem: Handles Loading (Bootstrap, Extension, Application ClassLoaders), Linking (Verify, Prepare, Resolve), and Initialization.\n' +
      '   - Runtime Data Areas: Method Area, Heap Area (Shared among threads), JVM Stacks, PC Registers, Native Method Stacks (Local to each thread).\n' +
      '   - Execution Engine: Interpreter, JIT Compiler (Just-In-Time compiler translating bytecode to native machine instructions for hot spots), and Garbage Collector.\n\n' +
      '2. Memory Management & Garbage Collection:\n' +
      '   - Heap memory is divided into Young Generation (Eden space, Survivor spaces S0/S1) and Old (Tenured) Generation.\n' +
      '   - Garbage Collectors (like G1GC, ZGC, Parallel GC) reclaim memory of unreferenced objects. ZGC provides sub-millisecond pause times for huge heaps.\n\n' +
      '3. Core Interview Questions & Answers:\n' +
      '   - Q: What is the difference between an Abstract Class and an Interface in Java?\n' +
      '     A: An Abstract Class can have state (instance variables) and both abstract and concrete methods. An interface represents a contract and (prior to Java 8) could only have abstract methods; post Java 8, it can have default and static methods, but cannot have instance state.\n' +
      '   - Q: Why is String immutable in Java?\n' +
      '     A: For security, caching (String Pool), thread safety, and class loading stability.\n' +
      '   - Q: What is the difference between Fail-Safe and Fail-Fast iterators?\n' +
      '     A: Fail-Fast iterators (e.g., ArrayList Iterator) throw ConcurrentModificationException immediately if the collection is modified during iteration. Fail-Safe iterators (e.g., ConcurrentHashMap Iterator) operate on a clone and do not throw exceptions.\n\n' +
      '4. Best Practices & Common Mistakes:\n' +
      '   - Best Practice: Always use StringBuilder instead of String concatenation in loops. Use try-with-resources to ensure auto-closing of file streams and database connections.\n' +
      '   - Common Mistake: Forgetting to override equals() and hashCode() together, which breaks custom objects when placed inside a HashMap or HashSet.'
  },
  {
    id: 'python',
    name: 'Python Development',
    category: 'Programming Languages',
    keywords: [
      'python', 'py', 'pip', 'gil', 'global interpreter lock', 'pandas', 'numpy', 'list comprehension', 
      'decorators', 'generators', 'virtualenv', 'dunder', 'explain python', 'tell me about python', 
      'define python', 'python basics', 'python dynamic typing', 'python memory management'
    ],
    simple: 'Python is an interpreted, high-level, general-purpose programming language that emphasizes code readability. Its design philosophy uses significant whitespace indentation and dynamic typing, making it a favorite for rapid application development, data science, automation, and AI.',
    detailed: 'Python Programming Language:\n\n' +
      '• Definition: An interpreted, interactive, object-oriented, and highly readable programming language.\n' +
      '• Features: Simple syntax, dynamically typed, interpreted execution, extensive standard library, multi-paradigm (supports procedural, OOP, and functional styles).\n' +
      '• Key Built-in Types: Lists (mutable sequences), Tuples (immutable sequences), Dictionaries (key-value hash maps), Sets (unordered unique items).\n' +
      '• Advanced Concepts:\n' +
      '  - Decorators: Functions that modify the behavior of other functions or classes (@my_decorator).\n' +
      '  - Generators: Functions using "yield" to return an iterator that yields values lazily, saving memory.\n' +
      '  - List Comprehensions: Elegant, concise syntax to create lists in a single line: [x**2 for x in items].\n' +
      '  - Dunder/Magic Methods: Double-underscore methods like __init__, __str__, and __call__ that override operator or built-in actions.',
    analysis: 'Deep Technical Analysis & Interview Prep (Python):\n\n' +
      '1. Python Runtime & Executing CPython:\n' +
      '   - CPython compiles source code (.py) into bytecode (.pyc), which is then executed by the CPython virtual machine.\n' +
      '   - The Global Interpreter Lock (GIL) is a mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes at once. This restricts CPU-bound tasks to a single core in multi-threaded programs (mitigated by using the multiprocessing module).\n\n' +
      '2. Memory Management:\n' +
      '   - Managed via reference counting and a generational garbage collector to handle reference cycles.\n\n' +
      '3. Core Interview Questions & Answers:\n' +
      '   - Q: What is the difference between List and Tuple in Python?\n' +
      '     A: Lists are mutable (can be changed, resized), slower, and consume slightly more memory. Tuples are immutable, faster, and can be used as dictionary keys.\n' +
      '   - Q: How does memory management work in Python?\n' +
      '     A: It is automated using private heap space, reference counting, and a cycle-detecting garbage collector.\n\n' +
      '4. Best Practices & Common Mistakes:\n' +
      '   - Best Practice: Adhere to PEP 8 standards. Use virtual environments (venv) for project isolation. Use generator expressions for massive streams to avoid out-of-memory errors.\n' +
      '   - Common Mistake: Using mutable default arguments like def my_func(a=[]). The list is instantiated once at function definition, leading to shared state bugs.'
  },
  {
    id: 'c_lang',
    name: 'C Programming',
    category: 'Programming Languages',
    keywords: [
      'c', 'c programming', 'c language', 'pointers', 'malloc', 'free', 'structures', 'unions', 
      'preprocessor', 'header files', 'pointer arithmetic', 'segmentation fault', 'printf', 'scanf'
    ],
    simple: 'C is a general-purpose, procedural computer programming language. It provides low-level access to memory, a simple set of keywords, and clean clean-to-metal compilation, making it the foundational language for operating systems and hardware-centric utilities.',
    detailed: 'C Programming Language:\n\n' +
      '• Definition: A highly efficient procedural language with direct memory mapping.\n' +
      '• Key Concepts: Pointers (variables that store memory addresses), Arrays, Functions, Structs (user-defined types grouping multiple variables), Unions.\n' +
      '• Memory Management: Explicit manual allocation using standard functions like malloc(), calloc(), realloc(), and deallocation via free().\n' +
      '• Preprocessor: Processes macros (#define), file inclusions (#include), and conditional compilations (#ifdef) before standard compilation begins.',
    analysis: 'Deep Technical Analysis & Interview Prep (C):\n\n' +
      '1. Direct Pointer Manipulation & Safety:\n' +
      '   - Pointers are incredibly fast but dangerous. Uninitialized pointers (wild pointers) or pointing to freed memory (dangling pointers) cause unpredictable memory access violations.\n\n' +
      '2. Common Interview Questions & Answers:\n' +
      '   - Q: What is a Dangling Pointer in C?\n' +
      '     A: A pointer pointing to a memory location that has been deallocated or freed. Accessing it causes undefined behavior or Segmentation Faults.\n' +
      '   - Q: Difference between malloc() and calloc()?\n' +
      '     A: malloc() allocates a single block of raw memory of specified bytes without initializing it. calloc() allocates multiple blocks of memory of specified size and initializes all bytes to zero.\n\n' +
      '3. Best Practices:\n' +
      '   - Best Practice: Always assign a pointer to NULL after calling free() to avoid dangling pointer references. Always verify if the pointer returned by malloc() is not NULL before using it.'
  },
  {
    id: 'cpp',
    name: 'C++ Systems Programming',
    category: 'Programming Languages',
    keywords: [
      'c++', 'cpp', 'raii', 'stl', 'vectors', 'templates', 'references', 'virtual functions', 
      'polymorphism', 'smart pointers', 'destructors', 'vtable', 'multiple inheritance', 'friend function'
    ],
    simple: 'C++ is a powerful, high-performance systems language that extends C with object-oriented capabilities, template metaprogramming, and deterministic resource management via RAII (Resource Acquisition Is Initialization).',
    detailed: 'C++ Programming Language:\n\n' +
      '• Definition: A multi-paradigm, compiled language designed for system and application programming.\n' +
      '• Key Features: Classes and Objects, Templates (generic programming), RAII, Destructors (auto-cleanup), and references.\n' +
      '• Standard Template Library (STL): Provides containers (std::vector, std::map, std::list), iterators, and high-performance algorithms.\n' +
      '• Memory Management: Manual or via Smart Pointers (std::unique_ptr, std::shared_ptr, std::weak_ptr) which automatically manage heap allocation lifecycles.',
    analysis: 'Deep Technical Analysis & Interview Prep (C++):\n\n' +
      '1. RAII & Smart Pointers:\n' +
      '   - RAII binds resources (files, memory, locks) to the lifetime of stack objects. When the object goes out of scope, its destructor is called, guaranteeing safe release.\n' +
      '   - unique_ptr enforces single ownership. shared_ptr maintains a reference count; weak_ptr resolves circular references.\n\n' +
      '2. Virtual Function & VTable Mechanism:\n' +
      '   - Achieves dynamic runtime polymorphism. If a class has virtual functions, the compiler creates a VTable (Virtual Table) containing pointers to those virtual functions. Each object has a hidden pointer (vptr) pointing to the VTable of its class.\n\n' +
      '3. Core Interview Questions & Answers:\n' +
      '   - Q: What is a Virtual Destructor and why is it needed?\n' +
      '     A: If a base class pointer points to a derived class object, deleting the base pointer without a virtual destructor in the base class leads to undefined behavior because only the base destructor is called, leaking derived resources.\n\n' +
      '4. Best Practices:\n' +
      '   - Best Practice: Never use raw "new" and "delete" in modern C++. Always prefer std::make_unique and std::make_shared.'
  },
  {
    id: 'javascript',
    name: 'JavaScript (JS)',
    category: 'Programming Languages',
    keywords: [
      'javascript', 'js', 'es6', 'promises', 'async await', 'event loop', 'closures', 'hoisting', 
      'prototypes', 'prototype chain', 'callbacks', 'var let const', 'this keyword', 'strict mode'
    ],
    simple: 'JavaScript is a lightweight, single-threaded, prototype-based, interpreted or JIT-compiled scripting language. It operates as the core execution engine of the web browser, bringing web interfaces to life with interactive logic.',
    detailed: 'JavaScript Fundamentals:\n\n' +
      '• Definition: A high-level, dynamic, single-threaded language supporting event-driven, functional, and object-oriented programming.\n' +
      '• Scope Variables: var (function scoped, hoisted), let (block scoped), const (block scoped, immutable reference).\n' +
      '• Closures: The combination of a function bundled together with references to its lexical environment, enabling the inner function to access variables of its parent scope even after the parent function completes.\n' +
      '• Hoisting: JavaScript engine moves declarations of functions and variables to the top of their containing scope prior to execution.\n' +
      '• Promises: An object representing the eventual completion or failure of an asynchronous operation.',
    analysis: 'Deep Technical Analysis & Interview Prep (JavaScript):\n\n' +
      '1. The Event Loop Architecture:\n' +
      '   - Call Stack: Executes synchronous functions.\n' +
      '   - Web APIs: Handles asynchronous tasks (timers, fetch) outside the thread.\n' +
      '   - Microtask Queue: Holds high-priority callbacks (Promises, MutationObserver).\n' +
      '   - Callback/Macrotask Queue: Holds standard events (setTimeout, onClick).\n' +
      '   - Event Loop: Continuously checks if Call Stack is empty, and pushes microtasks first, then macrotasks.\n\n' +
      '2. Core Interview Questions & Answers:\n' +
      '   - Q: Explain Closures and their real-world use case.\n' +
      '     A: Closures let a function retain variables of its outer scope. Used for data privacy (emulating private variables) and function memoization/factory methods.\n' +
      '   - Q: What is the difference between "==" and "==="?\n' +
      '     A: "==" checks for equality after performing implicit type coercion. "===" checks for equality of both value and type without coercion.\n\n' +
      '3. Best Practices:\n' +
      '   - Best Practice: Always use let and const instead of var. Use async/await over chain-nested Promises to prevent callback/promise hell.'
  },
  {
    id: 'typescript',
    name: 'TypeScript (TS)',
    category: 'Programming Languages',
    keywords: [
      'typescript', 'ts', 'compiler', 'interface vs type', 'generics', 'decorators', 'tsconfig', 
      'union types', 'intersection types', 'type assertions', 'enums', 'static typing', 'type safe'
    ],
    simple: 'TypeScript is an open-source, strongly typed programming language developed by Microsoft that acts as a strict syntactical superset of JavaScript, compiling down to clean readable JavaScript.',
    detailed: 'TypeScript Features & Structures:\n\n' +
      '• Definition: JavaScript with syntax for types, supporting static compile-time checking.\n' +
      '• Core Concepts: Interfaces (defines contracts for object shapes), Types (supports unions and intersections), Generics (reusable component templates with type parameters), Enums (numeric or string constants).\n' +
      '• Tooling: TSConfig.json file configures the TSC compiler target (ES5, ES6, etc.), strictness settings, and directory outputs.',
    analysis: 'Deep Technical Analysis & Interview Prep (TypeScript):\n\n' +
      '1. Advanced Type Mechanisms:\n' +
      '   - Union types (type | another) allow variable to hold multiple types.\n' +
      '   - Intersection types (type & another) combine multiple object shapes.\n' +
      '   - Type Guards: utilizing "typeof", "instanceof", or custom assertions to safely narrow down types inside code blocks.\n\n' +
      '2. Core Interview Questions & Answers:\n' +
      '   - Q: What is the difference between Interface and Type in TypeScript?\n' +
      '     A: Interfaces can be extended/merged (declaration merging) and are primarily used for object shapes. Types are more versatile; they can define unions, primitives, tuples, and intersections, but cannot be merged.\n' +
      '   - Q: What is "any" and why should we avoid it? What is "unknown"?\n' +
      '     A: "any" disables all type-checking. "unknown" is the type-safe counterpart; any value can be assigned to unknown, but you cannot perform operations on it without narrowing the type first.\n\n' +
      '3. Best Practices:\n' +
      '   - Best Practice: Enable "strict": true in tsconfig.json. Avoid "any" whenever possible, prefer "unknown" or generics.'
  },
  {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    category: 'Computer Science Fundamentals',
    keywords: [
      'dsa', 'data structures', 'algorithms', 'array', 'linked list', 'stack', 'queue', 'tree', 
      'binary search tree', 'bst', 'heap', 'graph', 'sorting', 'quick sort', 'merge sort', 'binary search', 
      'big o', 'time complexity', 'space complexity', 'recursion', 'dynamic programming', 'dp', 'greedy', 
      'hash map', 'hash table', 'dfs', 'bfs', 'dijkstra', 'bubble sort', 'insertion sort', 'selection sort'
    ],
    simple: 'Data Structures organise and store digital data for efficient lookup, deletion, and insertion. Algorithms are a series of logical steps to solve mathematical and structural computational problems with optimized time and space complexity.',
    detailed: 'Data Structures & Algorithms (DSA):\n\n' +
      '• Linear Data Structures:\n' +
      '  - Array: Fixed size, sequential contiguous memory, O(1) index access.\n' +
      '  - Linked List: Dynamic nodes with value and pointers. Insertion/deletion is O(1) once node is located.\n' +
      '  - Stack (LIFO - Last In First Out): Operates via push and pop.\n' +
      '  - Queue (FIFO - First In First Out): Operates via enqueue and dequeue.\n' +
      '• Non-Linear Data Structures:\n' +
      '  - Binary Search Tree (BST): Nodes where left is smaller and right is larger than parent. Search/Insert takes O(log N) average time.\n' +
      '  - Hash Map: Stores key-value pairs utilizing hash functions, offering average O(1) lookup and insertion.\n' +
      '  - Graph: Nodes (vertices) connected by links (edges); traversed using BFS and DFS.\n' +
      '• Algorithms:\n' +
      '  - Search: Binary Search (requires sorted array, O(log N)).\n' +
      '  - Sort: Merge Sort and Quick Sort (divide-and-conquer, average O(N log N)).\n' +
      '  - Dynamic Programming (DP): Solves complex problems by breaking them into overlapping subproblems, saving results in tables (Memoization/Tabulation).',
    analysis: 'Deep Technical Analysis & Interview Prep (DSA):\n\n' +
      '1. Big-O Complexity Hierarchy:\n' +
      '   - O(1) Constant Time < O(log N) Logarithmic < O(N) Linear < O(N log N) Log-Linear < O(N²) Quadratic < O(2ⁿ) Exponential.\n\n' +
      '2. Core Algorithms & Graph Routing:\n' +
      '   - Dijkstra\'s Algorithm: Finds the shortest path in a weighted graph from a single source node to all other nodes using a min-priority queue (Time complexity: O((V + E) log V)).\n' +
      '   - Breadth-First Search (BFS): Explores nodes level-by-level, utilizing a Queue. Ideal for shortest path in unweighted graphs.\n' +
      '   - Depth-First Search (DFS): Explores as deep as possible along each branch before backtracking, utilizing a Stack or system Recursion.\n\n' +
      '3. Core Interview Questions & Answers:\n' +
      '   - Q: What is the difference between dynamic programming and recursion?\n' +
      '     A: Recursion is a programming technique where a function calls itself. Dynamic programming is an optimization method that solves complex problems with overlapping subproblems using recursion + saving subproblem answers (memoization) to prevent redundant calculations.\n' +
      '   - Q: How do you detect a cycle in a Linked List?\n' +
      '     A: Use Floyd\'s Cycle-Finding Algorithm (Two Pointers/Tortoise and Hare). Move a slow pointer by 1 step and a fast pointer by 2 steps. If they meet, a cycle exists.\n\n' +
      '4. Best Practices:\n' +
      '   - Best Practice: Understand the space-time trade-off. For example, using a HashSet to store visited items reduces lookup time from O(N) to O(1) at the cost of O(N) extra space.'
  },
  {
    id: 'oop',
    name: 'Object-Oriented Programming (OOP)',
    category: 'Computer Science Fundamentals',
    keywords: [
      'oop', 'object oriented', 'encapsulation', 'abstraction', 'inheritance', 'polymorphism', 
      'classes', 'objects', 'solid principles', 'interface', 'override', 'overload', 'solid'
    ],
    simple: 'Object-Oriented Programming (OOP) is an intuitive paradigm where software design centers around real-world objects containing fields of data (state) and methods of code (behavior), built upon the four pillars of Encapsulation, Abstraction, Inheritance, and Polymorphism.',
    detailed: 'Object-Oriented Programming Pillars:\n\n' +
      '• Encapsulation: Bundling variable state and functional methods within a single class unit, and restricting direct access to object internals using private modifiers, exposing access via safe getters and setters.\n' +
      '• Abstraction: Hiding internal complex execution steps from the developer, revealing only a simple interface or abstract method contract.\n' +
      '• Inheritance: Reusing and extending existing codebase properties where a child class acquires state and methods of a parent class.\n' +
      '• Polymorphism: The ability to present the same interface for differing underlying forms. Includes Compile-Time Polymorphism (Method Overloading: same name, different signatures) and Run-Time Polymorphism (Method Overriding: child overrides parent class method).\n' +
      '• SOLID Principles:\n' +
      '  - Single Responsibility: A class should have only one reason to change.\n' +
      '  - Open/Closed: Software entities should be open for extension, closed for modification.\n' +
      '  - Liskov Substitution: Child classes must be substitutable for their parent classes.\n' +
      '  - Interface Segregation: Keep interfaces small and specific to avoid forcing unused methods.\n' +
      '  - Dependency Inversion: Depend on abstractions rather than concrete implementations.',
    analysis: 'Deep Technical Analysis & OOP Architecture:\n\n' +
      '1. Composition vs Inheritance:\n' +
      '   - Developers must favor Composition ("HAS-A" relationship) over deep Inheritance ("IS-A" relationship). Composition allows building complex classes by combining references to other class objects at runtime, eliminating the fragile base class problem.\n\n' +
      '2. Core Interview Questions & Answers:\n' +
      '   - Q: Difference between Method Overloading and Method Overriding?\n' +
      '     A: Overloading occurs in the same class, evaluated at compile-time, requiring different signatures. Overriding occurs in a subclass, evaluated at runtime, requiring matching signature and return type.\n' +
      '   - Q: What is the Liskov Substitution Principle (LSP)?\n' +
      '     A: It states that subclasses must be completely substitutable for their base classes without breaking the correctness of the application. For example, a Square class extending a Rectangle class can break LSP if changing the width of the square also forcefully modifies its height.\n\n' +
      '3. Common Mistakes:\n' +
      '   - Creating tight coupling between classes. Not using private modifiers, allowing objects to mutate another object\'s fields directly.'
  },
  {
    id: 'dbms',
    name: 'Database Management Systems (DBMS)',
    category: 'Computer Science Fundamentals',
    keywords: [
      'dbms', 'rdbms', 'database', 'acid', 'normalization', '1nf', '2nf', '3nf', 'bcnf', 'primary key', 
      'foreign key', 'indexing', 'b-tree', 'transactions', 'concurrency control', 'nosql', 'mongodb', 
      'postgresql', 'mysql'
    ],
    simple: 'A Database Management System (DBMS) is specialized system software designed to store, retrieve, update, and manage relational or non-relational data securely, guaranteeing transactional reliability via ACID properties.',
    detailed: 'DBMS Architecture & Relational Databases:\n\n' +
      '• Relational DBMS (RDBMS): Stores data in rows and columns inside tables with keys (PostgreSQL, MySQL, Oracle).\n' +
      '• Non-Relational DBMS (NoSQL): Unstructured, key-value, document, or graph databases (MongoDB, Redis, Cassandra).\n' +
      '• ACID Properties:\n' +
      '  - Atomicity: Transactions are completely processed or completely aborted (all-or-nothing).\n' +
      '  - Consistency: Ensures database is always in a structurally valid state before and after transaction.\n' +
      '  - Isolation: Concurrent transactions do not interfere or see each other\'s partial changes.\n' +
      '  - Durability: Once a transaction is committed, its changes survive system power failures or crashes.',
    analysis: 'Deep Technical Analysis & Concurrency Control:\n\n' +
      '1. Database Normalization & Forms:\n' +
      '   - 1NF: Atomic values, no repeating groups.\n' +
      '   - 2NF: In 1NF + removes partial dependencies (every non-key column depends fully on primary key).\n' +
      '   - 3NF: In 2NF + removes transitive dependencies (no non-key column depends on another non-key column).\n' +
      '   - BCNF: Stronger version of 3NF for multi-key tables.\n\n' +
      '2. Database Indexing (B-Tree Mechanics):\n' +
      '   - Indexes act as a map. RDBMS uses B-Trees which have a self-balancing tree structure, turning linear O(N) database scans into fast logarithmic O(log N) searches.\n\n' +
      '3. Core Interview Questions & Answers:\n' +
      '   - Q: What is the difference between SQL and NoSQL databases?\n' +
      '     A: SQL is relational, schema-enforced, vertically scalable, and uses structured SQL queries. NoSQL is non-relational, flexible schema, horizontally scalable (sharding), and is document, key-value, or graph based.\n' +
      '   - Q: Explain Database Indexing. Does it have disadvantages?\n' +
      '     A: Indexing speeds up data retrieval queries. The disadvantage is that it slows down data modifications (INSERT, UPDATE, DELETE) because the index tree must be updated, and it consumes extra disk space.'
  },
  {
    id: 'sql',
    name: 'SQL (Structured Query Language)',
    category: 'Databases',
    keywords: [
      'sql', 'select', 'join', 'inner join', 'left join', 'right join', 'full join', 'group by', 
      'having', 'subquery', 'stored procedure', 'views', 'crud', 'ddl', 'dml', 'dcl', 'aggregate functions', 
      'explain sql', 'define sql', 'sql join explanation', 'sql index'
    ],
    simple: 'SQL (Structured Query Language) is the domain-specific standard language used to interact with relational databases. It handles database creation, structural definition (DDL), and real-time data query and manipulation (DML).',
    detailed: 'SQL Statements & Query Constructs:\n\n' +
      '• DDL (Data Definition Language): CREATE, ALTER, DROP, TRUNCATE.\n' +
      '• DML (Data Manipulation Language): SELECT, INSERT, UPDATE, DELETE.\n' +
      '• DCL (Data Control Language): GRANT, REVOKE.\n' +
      '• Joins:\n' +
      '  - INNER JOIN: Returns records that have matching values in both tables.\n' +
      '  - LEFT JOIN: Returns all records from left table, and matching records from right.\n' +
      '  - RIGHT JOIN: Returns all records from right table, and matching records from left.\n' +
      '  - FULL JOIN: Returns all records when there is a match in either table.\n' +
      '• Aggregations: GROUP BY aggregates data; HAVING filters aggregated groups (unlike WHERE which filters rows before group aggregation).',
    analysis: 'SQL Logic Execution & Advanced Queries:\n\n' +
      '1. Logical Query Processing Order:\n' +
      '   FROM → ON → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT.\n\n' +
      '2. Core Interview Questions & Answers:\n' +
      '   - Q: What is the difference between WHERE and HAVING clauses?\n' +
      '     A: WHERE filters rows before they are aggregated by GROUP BY. HAVING is used to filter aggregated records after GROUP BY execution.\n' +
      '   - Q: What is a Correlated Subquery?\n' +
      '     A: A subquery that depends on the outer query for its values. It executes once for each row evaluated by the outer query, which can make it slow (O(N²)).\n\n' +
      '3. Code Example:\n' +
      '   SELECT d.name, COUNT(e.id) as emp_count \n' +
      '   FROM departments d \n' +
      '   LEFT JOIN employees e ON d.id = e.dept_id \n' +
      '   GROUP BY d.name \n' +
      '   HAVING COUNT(e.id) > 5;'
  },
  {
    id: 'mysql',
    name: 'MySQL Database',
    category: 'Databases',
    keywords: [
      'mysql', 'innodb', 'myisam', 'mysql storage engines', 'mysql indexing', 'mysql replication', 'mysql backup'
    ],
    simple: 'MySQL is an open-source relational database management system (RDBMS) based on Structured Query Language (SQL). It is a key component of the standard LAMP/LEMP stack powering web applications globally.',
    detailed: 'MySQL Architecture & Features:\n\n' +
      '• Storage Engines: InnoDB (default, supports ACID, foreign keys, row-level locking) and MyISAM (older, table-level locking, no transaction support).\n' +
      '• Replication: Supports Master-Slave and Master-Master replication to distribute database loads and ensure high availability.\n' +
      '• Scaling: Read replicas for scaling read operations; sharding for scaling write operations.',
    analysis: 'MySQL Core & Maintenance:\n\n' +
      '- Q: InnoDB vs MyISAM?\n' +
      '  A: InnoDB is transaction-safe (ACID compliant) and supports row-level locking. MyISAM has no transaction support, uses table-level locking, and is faster for pure select queries but bad for concurrent writes.\n' +
      '- Best Practice: Use EXPLAIN before complex queries to see if index scanning or full-table scanning is occurring.'
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL Database',
    category: 'Databases',
    keywords: [
      'postgresql', 'postgres', 'mvcc', 'postgresql jsonb', 'vacuuming', 'postgres replication'
    ],
    simple: 'PostgreSQL is an advanced, enterprise-class, open-source object-relational database system (ORDBMS) known for its strong extensibility, SQL compliance, and support for JSON/NoSQL document queries.',
    detailed: 'PostgreSQL Characteristics:\n\n' +
      '• Concurrency Model: Uses Multi-Version Concurrency Control (MVCC) allowing read transactions to run concurrently without locking out write transactions.\n' +
      '• JSONB Support: Binary storage format for JSON data, allowing indexing of JSON fields for rapid unstructured data queries.\n' +
      '• Extensibility: Supports custom data types, operators, and procedural language scripts (PL/pgSQL).',
    analysis: 'PostgreSQL Internals:\n\n' +
      '- Q: What is VACUUM in PostgreSQL?\n' +
      '  A: Due to MVCC, deleted or updated rows are not immediately removed from disk (they become dead tuples). VACUUM cleans up these dead tuples to reclaim storage space.\n' +
      '- Best Practice: Always utilize JSONB instead of regular JSON for document storage as JSONB supports advanced GIN indexes.'
  },
  {
    id: 'mongodb',
    name: 'MongoDB NoSQL',
    category: 'Databases',
    keywords: [
      'mongodb', 'mongo', 'nosql document', 'bson', 'sharding', 'mongodb replication', 'aggregation pipeline'
    ],
    simple: 'MongoDB is a leading document-oriented NoSQL database. It stores data in JSON-like BSON (Binary JSON) documents with dynamic schemas, making data integration in fast web apps simple and rapid.',
    detailed: 'MongoDB Architecture:\n\n' +
      '• Document Model: Collections contain BSON documents, which support nested sub-documents and arrays.\n' +
      '• Replication: Uses Replica Sets (Primary and Secondary nodes) to handle automated failover and read scaling.\n' +
      '• Sharding: Horizontally scales massive datasets across multiple servers by dividing collection data using a shard key.',
    analysis: 'MongoDB Optimization:\n\n' +
      '- Aggregation Pipeline: Multi-stage data processing pipeline (e.g., $match, $group, $sort, $project) that processes collection documents in sequential stages.\n' +
      '- Q: How does MongoDB achieve high availability?\n' +
      '  A: Using Replica Sets. If the primary node goes offline, the secondary nodes automatically elect a new primary node within seconds.'
  },
  {
    id: 'db_indexing_normalization',
    name: 'Indexing & Normalization',
    category: 'Databases',
    keywords: [
      'indexing', 'normalization', '1nf 2nf 3nf bcnf', 'index primary key', 'database redundancy', 'database normalization'
    ],
    simple: 'Indexing optimizes query performance by creating lookup structures, while Normalization structures the database schema to eliminate data redundancy and write anomalies.',
    detailed: 'Database Schema Optimization:\n\n' +
      '• Indexing: Creates a physical B-Tree structure matching keys to physical disk records. Includes Clustered (primary keys ordering) and Non-Clustered indexes.\n' +
      '• Normalization: Steps to clean data models. 1NF removes duplicate columns; 2NF removes partial dependencies on multi-key tables; 3NF removes transitive dependencies where a non-key column determines another non-key column.',
    analysis: 'Practical Scenarios:\n\n' +
      '- Q: When should you denormalize a database?\n' +
      '  A: In Read-Heavy systems (like data warehouses) to avoid complex, expensive JOINS, speeding up analytics queries at the cost of redundancy.'
  },
  {
    id: 'db_transactions_acid',
    name: 'Database Transactions & ACID',
    category: 'Databases',
    keywords: [
      'acid', 'transactions', 'isolation levels', 'read committed', 'serializable', 'dirty read', 'phantom read'
    ],
    simple: 'A database transaction is a sequence of operations executed as a single unit. Relational databases enforce ACID parameters to guarantee data reliability in multi-user concurrent operations.',
    detailed: 'ACID & Isolation Levels:\n\n' +
      '• ACID: Atomicity (all-or-nothing), Consistency (integrity constraints), Isolation (concurrency boundaries), Durability (survives crashes).\n' +
      '• Concurrency Issues: Dirty Reads (reading uncommitted changes), Non-Repeatable Reads (value changes during transaction), Phantom Reads (new rows appear during query).\n' +
      '• Isolation Levels: Read Uncommitted, Read Committed (default in Postgres/SQL Server), Repeatable Read (default in MySQL), and Serializable (strongest isolation, complete lock).',
    analysis: 'Concurrency Controls:\n\n' +
      '- Q: Difference between Pessimistic and Optimistic locking?\n' +
      '  A: Pessimistic locking locks the records immediately upon access. Optimistic locking does not lock rows, but checks for modifications (using a version column) before committing, failing if a collision is detected.'
  },
  {
    id: 'operating_systems',
    name: 'Operating Systems (OS)',
    category: 'Computer Science Fundamentals',
    keywords: [
      'operating system', 'os', 'kernel', 'process', 'thread', 'virtual memory', 'paging', 
      'segmentation', 'deadlock', 'bankers algorithm', 'mutex', 'semaphore', 'scheduling', 
      'cpu scheduling', 'round robin', 'context switch'
    ],
    simple: 'An Operating System (OS) is critical system software that acts as the intermediary interface between physical hardware and application programs, managing processes, CPU threads, virtual memory, and file structures.',
    detailed: 'Operating System Subsystems:\n\n' +
      '• Kernel: The core heart of the OS. Monolithic kernels (Linux) run drivers in kernel space; Microkernels (QNX) run them in user space.\n' +
      '• Process & Thread: A process is a program in execution with private virtual memory. A thread is a lightweight execution unit inside a process, sharing the process\'s memory.\n' +
      '• Virtual Memory: Simulates extensive RAM using paging (splitting memory into pages) and translation lookaside buffers (TLB), swapping pages to disk (Demand Paging).\n' +
      '• Process Synchronization: Mutex (binary lock) and Semaphores (counting lock) prevent race conditions.\n' +
      '• CPU Scheduling: Algorithms that assign CPU cores to threads, including Round Robin, FIFO, and Shortest Job First.',
    analysis: 'Deep Technical Analysis & OS Synchronization:\n\n' +
      '1. Deadlocks Necessary Conditions (Coffman Conditions):\n' +
      '   - Mutual Exclusion: Only one process can use a resource at a time.\n' +
      '   - Hold & Wait: Process holds resources while waiting for another.\n' +
      '   - No Preemption: Resources cannot be forcibly taken away.\n' +
      '   - Circular Wait: A closed loop of processes waiting for each other\'s resources.\n\n' +
      '2. Banker\'s Algorithm: Avoids deadlocks by dynamically testing safety state before allocating resources.\n\n' +
      '3. Core Interview Questions & Answers:\n' +
      '   - Q: What is a Context Switch and why is it expensive?\n' +
      '     A: A Context Switch stores the state (CPU registers, PC) of a running process so it can be resumed later, and loads the state of a new process. It is expensive because it consumes CPU cycles and flushes CPU caches (such as TLB).'
  },
  {
    id: 'computer_networks',
    name: 'Computer Networks',
    category: 'Computer Science Fundamentals',
    keywords: [
      'computer networks', 'networking', 'osi model', 'tcp ip', 'ip address', 'router', 'switch', 
      'http', 'https', 'dns', 'subnet', 'tcp vs udp', 'sockets', 'mac address', 'dhcp', 'firewall', 
      'tls', 'ssl', 'explain networking', 'explain computer networks'
    ],
    simple: 'Computer Networks connect systems to share data and packets using standardized protocol stacks like the 7-layer OSI model or the 4-layer TCP/IP suite, utilizing routers, switches, and secure application protocols.',
    detailed: 'Computer Networks & Internet Protocols:\n\n' +
      '• OSI 7-Layer Model: Physical (cables), Data Link (MAC frames, Switches), Network (IP packets, Routers), Transport (TCP/UDP segments), Session (session controls), Presentation (encryption, compression), Application (HTTP, DNS, FTP).\n' +
      '• TCP/IP Protocol Layer: Link, Internet (IP), Transport (TCP, UDP), Application (HTTP, DNS).\n' +
      '• Transport Protocol Comparison:\n' +
      '  - TCP: Connection-oriented, reliable (SYN, SYN-ACK, ACK), ordered delivery, congestion and flow control.\n' +
      '  - UDP: Connectionless, unreliable, low-overhead, fast datagram streaming (excellent for live gaming, voice calls).\n' +
      '• Infrastructure Protocols: DNS (domain name to IP resolution), DHCP (automatic IP assignment), TLS/SSL (asymmetric cryptography protecting HTTPS).',
    analysis: 'Deep Technical Analysis & Protocols:\n\n' +
      '1. TCP 3-Way Handshake & Teardown:\n' +
      '   - Connection: SYN (Client to Server) → SYN-ACK (Server to Client) → ACK (Client to Server).\n' +
      '   - Disconnection: FIN → ACK → FIN → ACK.\n\n' +
      '2. Core Interview Questions & Answers:\n' +
      '   - Q: Explain what happens when you type "google.com" in a browser.\n' +
      '     A: 1. Browser checks cache for IP, if not found, queries DNS resolver. 2. DNS returns IP address. 3. Browser initiates TCP 3-way handshake with IP on port 443 (HTTPS). 4. TLS handshake secures session. 5. Browser sends HTTP GET request. 6. Server processes and returns HTML response. 7. Browser renders DOM and page assets.\n' +
      '   - Q: What is Subnetting and why is it used?\n' +
      '     A: Subnetting splits a large IP network into smaller, manageable sub-networks, reducing broadcast traffic and improving network routing efficiency and security.'
  },
  {
    id: 'sdlc',
    name: 'Software Development Life Cycle (SDLC)',
    category: 'Software Engineering',
    keywords: [
      'sdlc', 'software development life cycle', 'waterfall', 'iterative sdlc', 'spiral model', 'software planning', 'v-model'
    ],
    simple: 'The Software Development Life Cycle (SDLC) is a structured process used by the software industry to design, develop, test, and deploy high-quality software, ensuring product requirements are systematically achieved.',
    detailed: 'SDLC Phases:\n\n' +
      '• Requirements Gathering & Analysis: Business analysts capture user needs.\n' +
      '• System Design: Architecture and UI design documents are defined.\n' +
      '• Implementation / Coding: Software developers write codebase.\n' +
      '• Testing: QA engineers identify bugs and test against requirements.\n' +
      '• Deployment: Launching application to production environments.\n' +
      '• Maintenance: Fixing bugs, handling updates, and scaling.',
    analysis: 'SDLC Methodologies:\n\n' +
      '- Waterfall: Linear sequential phases. Hard to change requirements after starting.\n' +
      '- Spiral: Risk-driven iterative model. Heavy focus on risk assessment.\n' +
      '- Q: Difference between Waterfall and Agile?\n' +
      '  A: Waterfall is linear, structured, and has rigid phases where testing happens only at the end. Agile is iterative, collaborative, flexible, and integrates coding and testing continuously.'
  },
  {
    id: 'agile',
    name: 'Agile Methodology',
    category: 'Software Engineering',
    keywords: [
      'agile', 'agile principles', 'agile manifesto', 'kanban', 'sprints agile', 'agile framework'
    ],
    simple: 'Agile is an iterative approach to software development and project management that helps teams deliver value to their customers faster and with fewer headaches, focusing on continuous feedback.',
    detailed: 'Agile Manifesto Principles:\n\n' +
      '• Core Values: 1. Individuals and interactions over processes and tools. 2. Working software over comprehensive documentation. 3. Customer collaboration over contract negotiation. 4. Responding to change over following a plan.\n' +
      '• Iterations: Splitting development into short cycles (1-4 weeks), allowing rapid adaptation based on feedback.\n' +
      '• Kanban: A visual method for managing work-in-progress (WIP) on boards (To Do, In Progress, Done) to prevent bottlenecks.',
    analysis: 'Agile Frameworks:\n\n' +
      '- Q: What is Velocity in Agile?\n' +
      '  A: A metric measuring the amount of work (in story points) a team completes in a single sprint, used to plan future sprint capacities.'
  },
  {
    id: 'scrum',
    name: 'Scrum Framework',
    category: 'Software Engineering',
    keywords: [
      'scrum', 'scrum master', 'product owner', 'sprint planning', 'daily standup', 'retrospective', 'product backlog'
    ],
    simple: 'Scrum is a popular lightweight framework within Agile where cross-functional teams deliver increments of functional software in fixed-length iterations called sprints.',
    detailed: 'Scrum Roles & Ceremonies:\n\n' +
      '• Scrum Roles:\n' +
      '  - Product Owner: Defines and prioritizes product requirements (Backlog).\n' +
      '  - Scrum Master: Facilitator, removes blockers, ensures Scrum principles are followed.\n' +
      '  - Development Team: Self-organizing group coding and testing the increments.\n' +
      '• Scrum Ceremonies:\n' +
      '  - Sprint Planning: Team selects backlog items for the upcoming sprint.\n' +
      '  - Daily Standup: 15-minute sync (What did I do, what will I do, any blockers).\n' +
      '  - Sprint Review: Demoing completed work to stakeholders.\n' +
      '  - Sprint Retrospective: Team reviews processes to identify improvements.',
    analysis: 'Scrum Technical Execution:\n\n' +
      '- Backlog Refinement: Grooming user stories to ensure they are estimated (Story Points) and meet the Definition of Done (DoD).\n' +
      '- Q: Difference between Sprint Review and Retrospective?\n' +
      '  A: Sprint Review is about the product (demoing to stakeholders). Sprint Retrospective is about the team and process (identifying how to work better).'
  },
  {
    id: 'design_patterns',
    name: 'Design Patterns',
    category: 'Software Engineering',
    keywords: [
      'design patterns', 'singleton', 'factory pattern', 'observer pattern', 'strategy pattern', 
      'builder pattern', 'decorator pattern', 'gang of four', 'creational structural behavioral'
    ],
    simple: 'Design Patterns are typical, reusable solutions to common software design problems encountered during development, categorised into Creational, Structural, and Behavioral patterns.',
    detailed: 'Gang of Four (GoF) Categories:\n\n' +
      '• Creational (Object creation mechanisms):\n' +
      '  - Singleton: Guarantees a class has only one global instance.\n' +
      '  - Factory Method: Decouples object instantiation from calling code.\n' +
      '  - Builder: Step-by-step assembly of complex objects.\n' +
      '• Structural (Composing classes and objects):\n' +
      '  - Adapter: Bridges incompatible interfaces.\n' +
      '  - Decorator: Dynamically attaches extra responsibilities to an object.\n' +
      '• Behavioral (Object interactions and communication):\n' +
      '  - Observer: Pub-Sub event model where subscribers are notified of changes.\n' +
      '  - Strategy: Encapsulates interchangeable algorithmic behaviors.',
    analysis: 'Design Pattern Tradeoffs:\n\n' +
      '- Singleton Implementation (Thread-Safe Double-Checked Locking in Java):\n' +
      '  ```java\n' +
      '  public class Singleton {\n' +
      '      private static volatile Singleton instance;\n' +
      '      private Singleton() {}\n' +
      '      public static Singleton getInstance() {\n' +
      '          if (instance == null) {\n' +
      '              synchronized (Singleton.class) {\n' +
      '                  if (instance == null) instance = new Singleton();\n' +
      '              }\n' +
      '          }\n' +
      '          return instance;\n' +
      '      }\n' +
      '  }\n' +
      '  ```\n' +
      '- Q: Why is Singleton sometimes considered an anti-pattern?\n' +
      '  A: It introduces global state, can mask tight coupling, and makes mock unit testing highly difficult.'
  },
  {
    id: 'uml',
    name: 'Unified Modeling Language (UML)',
    category: 'Software Engineering',
    keywords: [
      'uml', 'unified modeling language', 'class diagram', 'use case diagram', 'sequence diagram', 'uml activity'
    ],
    simple: 'UML (Unified Modeling Language) is a standardized modeling language consisting of visual diagrams used to specify, visualize, construct, and document the architecture of software systems.',
    detailed: 'Key UML Diagrams:\n\n' +
      '• Use Case Diagram: Shows system actors and their relationship with system use cases.\n' +
      '• Class Diagram: Static structural diagram representing system classes, attributes, methods, and access modifiers, including relationships (Association, Aggregation, Composition, Generalization/Inheritance).\n' +
      '• Sequence Diagram: Dynamic behavioral interaction diagram demonstrating object communication in step-by-step chronological order.\n' +
      '• Activity Diagram: Demonstrates procedural workflow step-by-step.',
    analysis: 'UML Relationships:\n\n' +
      '- Aggregation vs Composition: Aggregation represents a weak "has-a" relationship where the child can exist independently of parent (e.g., Department and Professor). Composition represents a strong ownership relationship where child lifecycle is tied to parent (e.g., House and Room).'
  },
  {
    id: 'system_design',
    name: 'System Design',
    category: 'Software Engineering',
    keywords: [
      'system design', 'scalability', 'horizontal scaling', 'load balancer', 'caching', 'sharding', 
      'rate limiting', 'microservices system design', 'dns system design', 'cap theorem'
    ],
    simple: 'System Design is the process of defining the architecture, interfaces, modules, and data for a software system to satisfy specified requirements, with a major focus on scalability, availability, and reliability.',
    detailed: 'Core System Design Pillars:\n\n' +
      '• Vertical vs Horizontal Scaling: Vertical adds hardware resources (RAM/CPU) to a single machine. Horizontal adds more machines to the network pool (scalable and fault-tolerant).\n' +
      '• Load Balancer: Distributes client network traffic across a cluster of backend servers to prevent overload (Nginx, AWS ALB).\n' +
      '• Caching: Temporarily stores query results in memory (Redis, Memcached) to reduce database read pressure (O(1) memory lookup).\n' +
      '• CAP Theorem: States that a distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, Partition Tolerance.',
    analysis: 'System Design Architectural Patterns:\n\n' +
      '- Microservices Architecture: Splits a monolithic application into small, independent, loosely coupled services communicating via lightweight APIs (REST/gRPC).\n' +
      '- Q: How do you scale a system to support millions of concurrent users?\n' +
      '  A: 1. Deploy load balancers to distribute traffic. 2. Scale application servers horizontally. 3. Implement Redis cache for read-heavy operations. 4. Use database read-replicas and sharding. 5. Integrate Content Delivery Networks (CDNs) for static media.'
  },
  {
    id: 'manual_testing',
    name: 'Manual Testing',
    category: 'Software Testing & QA',
    keywords: [
      'manual testing', 'black box manual', 'test cases design', 'boundary value analysis', 
      'equivalence partitioning', 'bug report', 'sdlc testing'
    ],
    simple: 'Manual Testing is the hands-on process of executing test cases manually on a software product without utilizing automation scripts, aiming to identify bugs, flaws, and functional gaps from an end-user perspective.',
    detailed: 'Manual Testing Methods:\n\n' +
      '• Test Case Design: Documenting Step Description, Test Data, Expected Results, Actual Results, and Status (Pass/Fail).\n' +
      '• Black-Box Design Techniques:\n' +
      '  - Equivalence Partitioning: Dividing input data ranges into equivalent ranges where test behaviors are identical, selecting one representative value.\n' +
      '  - Boundary Value Analysis: Testing inputs at the extreme boundaries of the equivalence partitions (e.g., min, min+1, max, max-1) where coding bugs occur most often.\n' +
      '• Bug Lifecycle: New → Open → Assigned → Fixed → Retesting → Closed.',
    analysis: 'Manual Testing Execution:\n\n' +
      '- Q: What is the difference between Verification and Validation?\n' +
      '  A: Verification is checking whether we are building the product right (reviews, walkthroughs). Validation is checking whether we built the right product (executing tests against the software).\n' +
      '- Best Practice: Include clear steps-to-reproduce, expected vs actual results, and system logs when logging bug tickets in Jira.'
  },
  {
    id: 'automation_testing',
    name: 'Automation Testing',
    category: 'Software Testing & QA',
    keywords: [
      'automation testing', 'test automation', 'test pyramid', 'automated test framework', 'cicd testing'
    ],
    simple: 'Automation Testing uses automated software tools and programmed scripts to execute test cases, compare output results, and automate repetitive regression testing tasks to speed up releases.',
    detailed: 'Automation Testing Scope & Tools:\n\n' +
      '• When to Automate: High-volume regression tests, repetitive smoke tests, performance testing, and complex data-driven tests.\n' +
      '• Automation Test Pyramid: Explains that an ideal framework contains a broad foundation of fast Unit Tests, a middle tier of Service/API Tests, and a tiny apex of selective UI tests.\n' +
      '• Popular Automation Frameworks: Selenium WebDriver, Playwright, Cypress, Appium (mobile).',
    analysis: 'Framework Architectures:\n\n' +
      '- Q: What are the primary types of automation frameworks?\n' +
      '  A: 1. Linear (Record and Playback). 2. Modular (independent page modules). 3. Data-Driven (separates test script from external CSV/Excel data). 4. Keyword-Driven (uses keywords to call functions). 5. Hybrid Framework (combines data and modular models).'
  },
  {
    id: 'selenium',
    name: 'Selenium Test Automation',
    category: 'Software Testing & QA',
    keywords: [
      'selenium', 'webdriver', 'locators', 'xpath', 'css selector', 'page object model', 'pom', 
      'explicit wait', 'implicit wait', 'test automation', 'testng', 'junit', 'grid', 'elementNotInteractable'
    ],
    simple: 'Selenium is an industry-standard open-source suite of browser automation tools used to write test scripts running against web browsers (Chrome, Firefox, Safari, Edge), validating front-end features.',
    detailed: 'Selenium WebDriver Core Architecture:\n\n' +
      '• Web Locators: ID, Name, Class Name, Tag Name, Link Text, XPath (Absolute/Relative using attributes/contains), and CSS Selectors.\n' +
      '• Element Synchronization Waits:\n' +
      '  - Implicit Wait: Global driver-level timeout telling WebDriver to poll the DOM for a specified duration before throwing NoSuchElementException.\n' +
      '  - Explicit Wait: Target-specific wait telling WebDriver to wait for specific conditions (ExpectedConditions.elementToBeClickable, visibilityOfElementLocated) before throwing TimeoutException.\n' +
      '• Page Object Model (POM): Design pattern modeling web pages as classes, separating page elements and action methods from the actual test assertion scripts.',
    analysis: 'Selenium Technical Architecture:\n\n' +
      '1. Protocol & Execution:\n' +
      '   - Test Scripts (Java/Python) → W3C WebDriver Protocol REST API commands → Browser Drivers (ChromeDriver, GeckoDriver) → Native Browser Actions.\n\n' +
      '2. Core Interview Questions & Answers:\n' +
      '   - Q: What is the difference between implicit and explicit waits?\n' +
      '     A: Implicit Wait is global, applied to all elements for the lifetime of the driver, and only waits for element presence. Explicit Wait is specific, applied to individual WebElements, and waits for sophisticated conditions (visibility, clickability).\n' +
      '   - Q: How do you handle StaleElementReferenceException in Selenium?\n' +
      '     A: This exception occurs when the element is no longer attached to the DOM (e.g., page refreshed). Fix it by: 1. Re-finding the element using driver.findElement before interaction. 2. Using explicit waits. 3. Page Object Model auto-initialization.\n\n' +
      '3. Code Example:\n' +
      '   ```java\n' +
      '   WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));\n' +
      '   WebElement loginBtn = wait.until(ExpectedConditions.elementToBeClickable(By.id("login")));\n' +
      '   loginBtn.click();\n' +
      '   ```'
  },
  {
    id: 'junit',
    name: 'JUnit Testing',
    category: 'Software Testing & QA',
    keywords: [
      'junit', 'junit 5', 'junit annotations', 'junit assertions', 'test parameterization'
    ],
    simple: 'JUnit is a popular unit testing framework for the Java programming language. It is a vital tool in Test-Driven Development (TDD) and integrates with build tools like Maven and Gradle.',
    detailed: 'JUnit Features & Annotations:\n\n' +
      '• Core Annotations (JUnit 5):\n' +
      '  - @Test: Denotes a test method.\n' +
      '  - @BeforeEach / @AfterEach: Runs before/after every test method.\n' +
      '  - @BeforeAll / @AfterAll: Runs once before/after all test methods (must be static).\n' +
      '  - @Disabled: Skips test execution.\n' +
      '• Assertions: Assertions.assertEquals(expected, actual), assertNotNull(object), assertTrue(condition).',
    analysis: 'Advanced JUnit:\n\n' +
      '- Q: Difference between @BeforeEach and @BeforeAll?\n' +
      '  A: @BeforeEach executes setup code separately before every @Test in the class. @BeforeAll executes once before any test methods, used for heavy tasks like database or server initialization.\n' +
      '- Best Practice: Keep tests completely independent so they can execute concurrently without shared state side-effects.'
  },
  {
    id: 'testng',
    name: 'TestNG Framework',
    category: 'Software Testing & QA',
    keywords: [
      'testng', 'testng annotations', 'testng dataprovider', 'testng xml', 'testng listeners'
    ],
    simple: 'TestNG is an advanced testing framework inspired by JUnit, designed to cover a wider range of testing categories like integration, end-to-end, and functional tests with richer configuration annotations.',
    detailed: 'TestNG Characteristics:\n\n' +
      '• Rich Annotations: @BeforeSuite, @BeforeTest, @BeforeClass, @BeforeMethod, @Test, @DataProvider (for data-driven testing).\n' +
      '• Testing XML (testng.xml): Configures test execution suites, groupings, parameters, parallel execution thread counts.\n' +
      '• Dependencies: Supports running test methods contingent on the pass/fail of other test methods using "dependsOnMethods".',
    analysis: 'TestNG Execution:\n\n' +
      '- Data-Driven Testing: @DataProvider returns an Object[][] array that feeds multiple rows of dynamic data into a single @Test method.\n' +
      '- Q: How do you achieve parallel test execution in TestNG?\n' +
      '  A: In testng.xml, specify the "parallel" attribute (e.g., parallel="methods" or parallel="tests") and "thread-count" count.'
  },
  {
    id: 'api_testing',
    name: 'API Testing & Postman',
    category: 'Software Testing & QA',
    keywords: [
      'api testing', 'postman', 'rest assured', 'http methods', 'status codes', 'json validation', 'postman variables'
    ],
    simple: 'API Testing focuses on verifying the backend business logic, security, and integration of REST/SOAP services. Postman is a leading GUI platform to build, send, and test API request collections.',
    detailed: 'API Testing Parameters:\n\n' +
      '• HTTP Methods: GET (retrieve), POST (create), PUT (update), DELETE (remove), PATCH (partial update).\n' +
      '• HTTP Status Codes: 200 OK (Success), 201 Created, 400 Bad Request (Client error), 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.\n' +
      '• Verification checklist: Payload structure, JSON schema compliance, Response Headers, Latency timeouts, and Authentication Bearer tokens.',
    analysis: 'API Automation:\n\n' +
      '- Q: What is the difference between PUT and PATCH?\n' +
      '  A: PUT replaces the entire target resource with the new request payload. PATCH applies a partial update to the resource.\n' +
      '- Best Practice: Use RestAssured (Java) or Postman pre-request/test scripts to automatically validate JSON response schemas.'
  },
  {
    id: 'regression_testing',
    name: 'Regression Testing',
    category: 'Software Testing & QA',
    keywords: [
      'regression testing', 'regression suite', 'impact analysis', 'automated regression'
    ],
    simple: 'Regression Testing is the process of re-executing a selective suite of test cases to verify that recent code modifications, bug fixes, or new features have not broken existing working features.',
    detailed: 'Regression Testing Practices:\n\n' +
      '• When to Run: Triggered after software code changes, bug patches, environment upgrades, or library changes.\n' +
      '• Automated Regression: Frequently automated in CI/CD pipelines to run on every commit or nightly build, identifying failures immediately.\n' +
      '• Scope selection: Utilizing Impact Analysis to select the most critical test cases in affected code modules instead of executing the entire database of tests.',
    analysis: 'Regression Scenarios:\n\n' +
      '- Q: Difference between Re-testing and Regression testing?\n' +
      '  A: Re-testing executes a specific failed test case again to confirm the bug was fixed. Regression testing checks the rest of the application to ensure the fix did not break anything else.'
  },
  {
    id: 'smoke_testing',
    name: 'Smoke & Sanity Testing',
    category: 'Software Testing & QA',
    keywords: [
      'smoke testing', 'sanity testing', 'build verification test', 'smoke test suite'
    ],
    simple: 'Smoke Testing is a rapid build-verification test executed on a fresh software build to confirm that the critical, high-level core features are functioning before initiating deeper manual or automated testing.',
    detailed: 'Smoke & Sanity Characteristics:\n\n' +
      '• Smoke Testing:\n' +
      '  - Scope: Verifies overall build stability. Covers end-to-end critical flows (e.g., App starts up, login page loads, database connects).\n' +
      '  - Execution: Non-exhaustive, completed in minutes. If smoke tests fail, the build is rejected immediately.\n' +
      '• Sanity Testing:\n' +
      '  - Scope: Focused testing on a specific component or bug fix to verify that a module works as expected after modification.',
    analysis: 'QA Lifecycles:\n\n' +
      '- Q: When is Smoke testing performed?\n' +
      '  A: Immediately after a new build is deployed to the test environment, acting as a gatekeeper for deep QA testing.'
  },
  {
    id: 'integration_testing',
    name: 'Integration & System Testing',
    category: 'Software Testing & QA',
    keywords: [
      'integration testing', 'system testing', 'stub', 'driver testing', 'top down integration', 'bottom up integration'
    ],
    simple: 'Integration Testing verifies the interface data flow between interacting software modules. System Testing validates the complete, integrated end-to-end software application against specified requirements.',
    detailed: 'Testing Interfacing Modules:\n\n' +
      '• Integration Testing Approaches:\n' +
      '  - Big Bang: Integrating all modules simultaneously (difficult to isolate bugs).\n' +
      '  - Top-Down: Testing top modules first, using Stubs (mock components representing lower modules).\n' +
      '  - Bottom-Up: Testing lower modules first, using Drivers (calling components representing upper modules).\n' +
      '• System Testing: Completely black-box, executing business workflows across databases, networks, and external services.',
    analysis: 'Integration Engineering:\n\n' +
      '- Q: What is the difference between a Stub and a Driver?\n' +
      '  A: Stubs are called by the module under test (representing down-stream modules). Drivers call the module under test (representing up-stream parent modules).'
  },
  {
    id: 'performance_testing',
    name: 'Performance Testing',
    category: 'Software Testing & QA',
    keywords: [
      'performance testing', 'jmeter', 'load testing', 'stress testing', 'spike testing', 'throughput', 'response time'
    ],
    simple: 'Performance Testing evaluates the speed, responsiveness, scalability, stability, and resource utilization of a system under varying workload conditions, utilizing load tools like Apache JMeter.',
    detailed: 'Performance Testing Categories:\n\n' +
      '• Load Testing: Testing system behavior under expected normal and peak user loads.\n' +
      '• Stress Testing: Testing system boundaries by pushing user volume beyond break points to see how it recovers.\n' +
      '• Endurance / Soak Testing: Running sustained load tests over long periods to detect memory leaks and resource exhaustion.\n' +
      '• Spike Testing: Testing system response to sudden, extreme surges in user traffic.\n' +
      '• Key Metrics: Average Response Time, Throughput (Transactions Per Second), CPU/RAM usage, and Error Rate.',
    analysis: 'Performance Diagnostics:\n\n' +
      '- Q: Difference between Load and Stress testing?\n' +
      '  A: Load testing verifies the system meets SLAs under expected volume. Stress testing pushes the system to its breaking point to evaluate error handling and recovery.\n' +
      '- Tool: Apache JMeter compiles thread groups sending concurrent HTTP requests to endpoints, plotting latency and success curves.'
  },
  {
    id: 'spring_boot',
    name: 'Spring Boot Framework',
    category: 'Backend Technologies',
    keywords: [
      'spring boot', 'spring', 'dependency injection', 'ioc', 'inversion of control', 'spring mvc', 
      'spring data jpa', 'rest controller', 'annotations', 'beans', 'application.properties', 
      'spring security', 'explain spring boot', 'why spring boot', 'spring injection'
    ],
    simple: 'Spring Boot is an open-source, opinionated Java framework used to build microservices and enterprise applications. It simplifies development by providing auto-configuration, starter POMs, and an embedded web server.',
    detailed: 'Spring Boot Ecosystem & Architecture:\n\n' +
      '• Inversion of Control (IoC) & Dependency Injection (DI):\n' +
      '  - Instead of objects creating their dependencies manually, the Spring IoC Container manages object lifetimes and injects dependencies via annotations (@Autowired).\n' +
      '• Annotations:\n' +
      '  - @SpringBootApplication: Triggers auto-configuration, component scanning (@ComponentScan), and Spring configuration.\n' +
      '  - @RestController: Defines an API endpoint handler class returning JSON payloads.\n' +
      '  - @Service: Houses business logical calculations.\n' +
      '  - @Repository: Handles database access methods.\n' +
      '• Starter Dependencies: Groups related dependencies under single pom.xml starters (e.g., spring-boot-starter-web) to manage versions and auto-configure beans.',
    analysis: 'Deep Technical Analysis (Spring Boot):\n\n' +
      '1. Spring Bean Lifecycle:\n' +
      '   - Instantiate → Populate Properties → Call BeanPostProcessor Before → Initialize (@PostConstruct) → Call BeanPostProcessor After → Ready → Destroy (@PreDestroy).\n\n' +
      '2. Core Interview Questions & Answers:\n' +
      '   - Q: What is the difference between @Component, @Service, and @Repository annotations?\n' +
      '     A: All are stereotypes that register the class as a Spring Bean. However, @Repository translates database-specific exceptions into Spring exception wrappers, and @Service clearly denotes business logic components.\n' +
      '   - Q: How does Spring Boot\'s @EnableAutoConfiguration work?\n' +
      '     A: It scans the project classpath. If it finds specific jars (e.g., h2-database), it automatically configures corresponding Beans (e.g., DataSource) inside the Application Context unless overridden.\n\n' +
      '3. Best Practices:\n' +
      '   - Best Practice: Always favor Constructor Injection over Field Injection (@Autowired directly on variables) to improve testability and ensure immutable fields.'
  },
  {
    id: 'spring_mvc',
    name: 'Spring MVC Architecture',
    category: 'Backend Technologies',
    keywords: [
      'spring mvc', 'dispatcher servlet', 'handler mapping', 'view resolver', 'spring model view controller'
    ],
    simple: 'Spring MVC is the Model-View-Controller framework built on the Servlet API, utilized to build flexible web application backends and API services.',
    detailed: 'Spring MVC Request Lifecycle:\n\n' +
      '• Request entry: Client HTTP Request is received by DispatcherServlet (the Front Controller).\n' +
      '• Route mapping: DispatcherServlet consults HandlerMapping to identify the correct Controller.\n' +
      '• Controller Execution: Controller runs business operations, updates Model state, and returns View Name.\n' +
      '• Render View: DispatcherServlet consults ViewResolver to load template, renders HTML page, and returns response.',
    analysis: 'Spring MVC Internals:\n\n' +
      '- Q: What is DispatcherServlet in Spring MVC?\n' +
      '  A: It is the central servlet acting as the Front Controller, coordinating all incoming HTTP requests to corresponding mapping controllers, handling template rendering, and returning payloads.'
  },
  {
    id: 'spring_security',
    name: 'Spring Security',
    category: 'Backend Technologies',
    keywords: [
      'spring security', 'security filter chain', 'userdetailsservice', 'bryptpasswordencoder', 'cors security'
    ],
    simple: 'Spring Security is a highly customizable authentication and access-control framework designed to protect Spring-based enterprise applications from attacks like CSRF and session hijacking.',
    detailed: 'Spring Security Features:\n\n' +
      '• Security Filter Chain: A chain of filters that intercepts incoming HTTP requests to validate authentication headers, sessions, and roles.\n' +
      '• Authentication (Who you are) vs Authorization (What you can do).\n' +
      '• Encryption: Utilizes BCryptPasswordEncoder to hash user password strings before database insertion.',
    analysis: 'Spring Security Architecture:\n\n' +
      '- Q: How does Spring Security work under the hood?\n' +
      '  A: It utilizes Servlet Filters. A request passes through the SecurityFilterChain. Filters like UsernamePasswordAuthenticationFilter extract credentials and delegate validation to the AuthenticationManager.\n' +
      '- Best Practice: Disable basic HTTP authentication in production, always utilize token-based security (JWT) and secure HTTPS cookies.'
  },
  {
    id: 'rest_api',
    name: 'REST API Design',
    category: 'Backend Technologies',
    keywords: [
      'rest api', 'restful web services', 'rest principles', 'idempotency rest', 'stateless api'
    ],
    simple: 'A REST (Representational State Transfer) API is an architectural style for designing networked applications, using standard HTTP methods and stateless communication over JSON.',
    detailed: 'REST Principles:\n\n' +
      '• Statlesness: Every client request must contain all context and authentication tokens needed to process it. Server stores no session context.\n' +
      '• Resource-Based URLs: Paths use plural nouns rather than actions (e.g., GET /api/v1/users instead of GET /api/v1/getUsers).\n' +
      '• Idempotency: Multiple identical requests return the same system state. GET, PUT, and DELETE are idempotent; POST (creating resources) is not.',
    analysis: 'REST Performance:\n\n' +
      '- Q: Difference between POST and PUT?\n' +
      '  A: POST is used to create a new child resource under a collection, and is non-idempotent. PUT replaces or creates a resource at a specific, known URI, and is idempotent.'
  },
  {
    id: 'jwt',
    name: 'JWT (JSON Web Tokens)',
    category: 'Backend Technologies',
    keywords: [
      'jwt', 'json web tokens', 'jwt secret', 'access token', 'refresh token', 'jwt structure'
    ],
    simple: 'JSON Web Token (JWT) is an open standard (RFC 7519) that defines a compact, self-contained way for securely transmitting information between parties as a signed JSON object.',
    detailed: 'JWT Structure (Three Base64URL-encoded parts split by dots):\n\n' +
      '• Header: Specifies Token Type (JWT) and Signature Algorithm (HS256).\n' +
      '• Payload: Contains claims (user ID, username, roles, expiration date).\n' +
      '• Signature: Combines encoded Header, encoded Payload, and a secure server-side Secret Key signed with specified algorithm.',
    analysis: 'JWT Token Security:\n\n' +
      '- Q: How are JWTs verified? Can users mutate payloads?\n' +
      '  A: Verification is done by decoding the Header and Payload, combining them with the server secret, and checking if the resulting hash matches the token\'s Signature. If a user modifies the payload, the signature is invalidated.\n' +
      '- Best Practice: Keep expiration times of access tokens short (e.g., 15 mins), and utilize secure HttpOnly, SameSite cookies for storage.'
  },
  {
    id: 'hibernate_jpa',
    name: 'Hibernate & JPA',
    category: 'Backend Technologies',
    keywords: [
      'hibernate', 'jpa', 'orm', 'entity lifecycle', 'lazy loading', 'eager loading', 'n+1 query problem'
    ],
    simple: 'JPA (Java Persistence API) is a specification defining object-relational mapping (ORM) in Java. Hibernate is the leading framework implementation of JPA, translating database tables directly into Java objects.',
    detailed: 'ORM & Entity Lifecycle:\n\n' +
      '• ORM: Automates writing custom SQL queries, binding database rows to Java classes (@Entity).\n' +
      '• Entity States: Transient (new, not saved), Managed (saved, tracked by Session), Detached (session closed, not tracked), Removed (marked for delete).\n' +
      '• Fetch Strategies:\n' +
      '  - Lazy Loading: Postpones loading related child objects from database until actively accessed (saves memory).\n' +
      '  - Eager Loading: Instantly retrieves related entities using database JOIN statements.',
    analysis: 'Database Performance (JPA):\n\n' +
      '- Q: What is the N+1 Query Problem in JPA, and how do you resolve it?\n' +
      '  A: It occurs when you fetch a list of parent objects, and accessing a lazy-loaded child collection on each parent triggers N separate database SELECT queries (1 query for parents + N queries for children). Resolve it by using "JOIN FETCH" in JPQL queries to load parents and children in a single database round-trip.\n' +
      '- Code: @Query("SELECT u FROM User u JOIN FETCH u.roles")'
  },
  {
    id: 'maven_gradle',
    name: 'Maven & Gradle Build Tools',
    category: 'Backend Technologies',
    keywords: [
      'maven', 'gradle', 'pom xml', 'build gradle', 'maven lifecycle', 'maven repository'
    ],
    simple: 'Maven and Gradle are automated build systems used to manage project dependency packages, run compiler scripts, execute tests, and package software applications.',
    detailed: 'Build Tools Comparison:\n\n' +
      '• Maven (XML Configuration: pom.xml):\n' +
      '  - Features: Declarative model, opinionated directory structures, strict lifecycle phases (clean, compile, test, package, install, deploy).\n' +
      '• Gradle (Groovy/Kotlin DSL: build.gradle):\n' +
      '  - Features: Programmatic builds, incremental compile caches, faster performance for massive projects.',
    analysis: 'Maven Lifecycle:\n\n' +
      '- Q: Explain transitive dependency in Maven.\n' +
      '  A: If your project depends on library A, and library A depends on library B, Maven automatically downloads and links library B into your classpath.'
  },
  {
    id: 'react',
    name: 'React',
    category: 'Frontend Technologies',
    keywords: [
      'react', 'virtual dom', 'react hooks', 'useeffect', 'usestate', 'usecontext', 'usememo', 
      'usecallback', 'props', 'state management', 'components', 'single page app', 'react-markdown', 
      'lucide-react', 'explain react', 'how react works'
    ],
    simple: 'React is an open-source, component-based frontend JavaScript library developed by Meta. It manages view updates efficiently using a Virtual DOM and supports building interactive Single Page Applications (SPAs).',
    detailed: 'React Architecture & State:\n\n' +
      '• Virtual DOM: Instead of writing updates directly to the slow browser DOM, React updates an in-memory representation. It then diffs the new Virtual DOM with the old one (Reconciliation) and applies only the specific changes to the real DOM.\n' +
      '• Functional Components: JavaScript functions returning UI elements styled via JSX.\n' +
      '• Hooks:\n' +
      '  - useState: Stores local variable state that triggers re-rendering on mutation.\n' +
      '  - useEffect: Executes side effects (data fetching, subscriptions) in sync with component lifecycles.\n' +
      '  - useContext: Subscribes to context providers for global state without prop-drilling.\n' +
      '  - useMemo / useCallback: Memoizes calculated values and callback functions to prevent unnecessary child re-renders.',
    analysis: 'Deep Technical Analysis (React):\n\n' +
      '1. Render Pipeline & Reconciliation:\n' +
      '   - Render Phase: Generates JSX elements representing UI.\n' +
      '   - Commit Phase: Applies updates to physical DOM nodes.\n' +
      '   - Fiber Engine: Enables split, non-blocking render work.\n\n' +
      '2. Core Interview Questions & Answers:\n' +
      '   - Q: What are the primary rules of React Hooks?\n' +
      '     A: 1. Only call hooks at the top level (never inside loops, conditions, or nested functions). 2. Only call hooks from React functional components or custom hooks.\n' +
      '   - Q: Why is a "key" prop required when rendering list arrays?\n' +
      '     A: Keys help React identify which list items have changed, been added, or been removed, optimizing the diffing process and preventing state mismatch bugs.'
  },
  {
    id: 'html_dev',
    name: 'HTML & Semantic Markup',
    category: 'Frontend Technologies',
    keywords: [
      'html', 'html5', 'semantic tags', 'dom tree', 'accessibility html'
    ],
    simple: 'HTML (HyperText Markup Language) is the standard structure-defining language for building documents served to web browsers, forming the structural bones of every webpage.',
    detailed: 'HTML5 Elements:\n\n' +
      '• Semantic Markup: Tag names describe their content purpose (<header>, <nav>, <main>, <section>, <article>, <footer>, <aside>) helping search engine indexing (SEO) and accessibility screen-readers.\n' +
      '• DOM Tree: The Browser parses raw HTML tags into an interactive tree of Document Object Model node objects.',
    analysis: 'Accessibility:\n\n' +
      '- Q: Difference between HTML tags <div> and <section>?\n' +
      '  A: <div> is a generic layout container with no semantic meaning. <section> is a semantic block enclosing a thematic grouping of content, typically with a heading.'
  },
  {
    id: 'css_styling',
    name: 'CSS & Layouts',
    category: 'Frontend Technologies',
    keywords: [
      'css', 'flexbox', 'css grid', 'media queries', 'tailwind css', 'box model'
    ],
    simple: 'CSS (Cascading Style Sheets) controls the visual presentation, styling, layout, and responsive alignment of HTML documents across differing screen sizes.',
    detailed: 'CSS Mechanics:\n\n' +
      '• CSS Box Model: Every HTML element is modeled as a box consisting of Content, Padding, Border, and Margin.\n' +
      '• Flexbox (1D Layout): Ideal for aligning elements on a single row or column.\n' +
      '• CSS Grid (2D Layout): Ideal for building complex multi-row, multi-column layouts.\n' +
      '• Responsive Queries: @media screen and (max-width: 768px) adapts styles to smaller screens.',
    analysis: 'Tailwind CSS:\n\n' +
      '- Tailwind CSS provides utility classes directly in HTML tags, eliminating custom stylesheet files, ensuring consistency, and reducing production CSS file footprints.'
  },
  {
    id: 'git',
    name: 'Git & Version Control',
    category: 'DevOps & Version Control',
    keywords: [
      'git', 'version control', 'commit', 'branch', 'merge', 'rebase', 'stash', 'conflict', 'head', 'cherry-pick'
    ],
    simple: 'Git is a distributed version control system that tracks source code changes across branches, allowing developers to collaborate, revert revisions, and maintain a history of their project.',
    detailed: 'Git Data Flow & Commands:\n\n' +
      '• Working Areas: Working Directory (modified files) → Staging Area / Index (git add) → Local Repository (git commit) → Remote Server (git push).\n' +
      '• Core Branching Commands:\n' +
      '  - git branch: Creates branches to isolate new feature code.\n' +
      '  - git merge: Merges target branch history, creating a merge commit.\n' +
      '  - git rebase: Moves local commits to the tip of the target branch, rewriting history to keep it linear.\n' +
      '• Stashing: git stash temporarily shelves uncommitted local modifications to clean the working branch.',
    analysis: 'Git DAG Architecture:\n\n' +
      '- Q: What is a Git Merge Conflict and how is it resolved?\n' +
      '  A: It occurs when two branches modify the same line of a file, and Git cannot automatically decide which change to keep. Resolve it by manually editing the conflicted file, choosing between head and incoming blocks, staging, and committing.'
  },
  {
    id: 'github',
    name: 'GitHub Platform',
    category: 'DevOps & Version Control',
    keywords: [
      'github', 'pull request', 'pr', 'github actions', 'clone github'
    ],
    simple: 'GitHub is a cloud-hosted hosting platform for Git repositories. It provides collaboration tools like Pull Requests (PRs), code reviews, project issues tracking, and GitHub Actions automation.',
    detailed: 'GitHub Collaboration Flow:\n\n' +
      '• Fork & Clone: Fork creates a copy of a remote repository under your account; Clone downloads it to your machine.\n' +
      '• Pull Request (PR): A request to merge branch code into the main repository, allowing peer reviews, conversations, and unit-test automation checks before merging.',
    analysis: 'GitHub Actions:\n\n' +
      '- Automates CI/CD pipelines directly inside GitHub, running linting, compilation, and cloud deployment scripts on code push.'
  },
  {
    id: 'docker',
    name: 'Docker & Containers',
    category: 'DevOps & Cloud Systems',
    keywords: [
      'docker', 'container', 'dockerfile', 'image', 'volume', 'registry', 'port mapping', 
      'containerization', 'cgroups', 'namespaces', 'docker run'
    ],
    simple: 'Docker is an open-source containerization platform that packages software code and all of its runtime libraries, dependencies, and configuration settings into a single lightweight, portable container.',
    detailed: 'Docker Components & Files:\n\n' +
      '• Dockerfile: Text file containing instruction commands to build a read-only Docker Image layer by layer.\n' +
      '• Image vs Container: An image is a read-only snapshot containing the runtime binaries. A container is a live, running instance of an image.\n' +
      '• Storage Volumes: Persists container-generated database data on the host machine, preventing data loss when a container terminates.\n' +
      '• Isolation: Uses Linux Namespaces for process/network isolation, and control groups (cgroups) for resource limits.',
    analysis: 'Docker Internals:\n\n' +
      '- Q: Difference between a Container and a Virtual Machine?\n' +
      '  A: Virtual Machines package an application alongside a heavy guest OS, running via a hypervisor. Containers share the host OS kernel and run as isolated processes, making them significantly faster, lighter, and smaller.\n' +
      '- Docker commands: "docker build -t app ." builds an image, and "docker run -p 3000:3000 app" maps local ports to run it.'
  },
  {
    id: 'docker_compose',
    name: 'Docker Compose',
    category: 'DevOps & Cloud Systems',
    keywords: [
      'docker compose', 'docker-compose.yml', 'multi container docker', 'docker-compose up'
    ],
    simple: 'Docker Compose is a tool used to define and run multi-container Docker applications, configuring services, networks, and storage volumes in a single YAML file.',
    detailed: 'Docker Compose Orchestration:\n\n' +
      '• Configuration File (docker-compose.yml): Specifies services (e.g., backend app, postgreSQL database, redis cache), environment secrets, internal network mappings, and storage directories.\n' +
      '• Commands: "docker-compose up" starts all microservices concurrently; "docker-compose down" stops and cleans up containers.',
    analysis: 'Docker Compose Networks:\n\n' +
      '- It automatically creates a default network where services can communicate with each other using their service name (e.g., database service is accessible at host: "db").'
  },
  {
    id: 'cicd',
    name: 'CI/CD Pipelines',
    category: 'DevOps & Cloud Systems',
    keywords: [
      'ci/cd', 'ci cd', 'continuous integration', 'continuous deployment', 'pipeline stage'
    ],
    simple: 'CI/CD bridges development and operations by automating the building, testing, and deployment of software increments, reducing integration times and accelerating releases.',
    detailed: 'CI/CD Pipeline Breakdown:\n\n' +
      '• Continuous Integration (CI): Developers merge code changes frequently. Automated triggers compile code, run linters, and execute unit test suites on every commit.\n' +
      '• Continuous Delivery: Automates packaging code, uploading builds to registries, and staging deployment.\n' +
      '• Continuous Deployment (CD): Automatically deploys passed builds to production, enabling hands-free, rapid releases.',
    analysis: 'Pipeline Quality:\n\n' +
      '- Q: Why is CI/CD critical in modern DevOps?\n' +
      '  A: It prevents "integration hell" where massive code changes collide, catches bugs early in test suites, and eliminates risky manual deployments.'
  },
  {
    id: 'jenkins',
    name: 'Jenkins Automation Server',
    category: 'DevOps & Cloud Systems',
    keywords: [
      'jenkins', 'jenkinsfile', 'jenkins pipeline', 'jenkins agent', 'jenkins multibranch'
    ],
    simple: 'Jenkins is a leading open-source automation server that provides hundreds of plugins to support building, deploying, and automating software projects.',
    detailed: 'Jenkins Mechanics:\n\n' +
      '• Jenkinsfile: Configuration-as-code file containing declarative or scripted pipeline instructions.\n' +
      '• Pipeline Stages: checkout, build, unit-test, security-scan, push-image, and deploy-to-cloud.\n' +
      '• Distributed Builds: Uses a Controller node to orchestrate tasks across multiple Agent nodes, scaling capacity.',
    analysis: 'Jenkins Pipelines:\n\n' +
      '- Q: Difference between Declarative and Scripted pipelines in Jenkins?\n' +
      '  A: Declarative is user-friendly and structured (using a pre-defined layout). Scripted uses Groovy code, providing massive flexibility but requiring deep coding knowledge.'
  },
  {
    id: 'ai_concepts',
    name: 'Artificial Intelligence (AI)',
    category: 'Artificial Intelligence',
    keywords: [
      'artificial intelligence', 'ai', 'turing test', 'weak ai', 'strong ai', 'generative ai', 'agi'
    ],
    simple: 'Artificial Intelligence (AI) is a broad computer science domain focused on building systems capable of performing tasks that typically require human intelligence, such as decision-making, pattern recognition, and translation.',
    detailed: 'AI Paradigms:\n\n' +
      '• Narrow (Weak) AI: Designed to handle specific tasks (e.g., Siri, chess engine, recommendation systems).\n' +
      '• General (Strong) AI / AGI: Theoretical systems capable of matching or exceeding human reasoning and cognitive capabilities across any domain.\n' +
      '• Generative AI: Subfield that leverages deep learning to generate text, images, audio, or video based on prompts.',
    analysis: 'Evolution:\n\n' +
      '- AI is the umbrella field enclosing Machine Learning, which in turn encloses Deep Learning (multi-layer neural networks).'
  },
  {
    id: 'machine_learning',
    name: 'Machine Learning (ML)',
    category: 'Artificial Intelligence',
    keywords: [
      'machine learning', 'ml', 'supervised learning', 'unsupervised learning', 'overfitting', 
      'underfitting', 'classification', 'regression', 'gradient descent'
    ],
    simple: 'Machine Learning (ML) is a subset of AI focused on training statistical algorithms to identify patterns in historic data and make dynamic predictions on new datasets without being explicitly programmed.',
    detailed: 'ML Categories & Core Tuning:\n\n' +
      '• Supervised Learning: Models are trained on labeled datasets containing features and target answers. Includes Regression (continuous variables like home prices) and Classification (labels like spam/not-spam).\n' +
      '• Unsupervised Learning: Models discover hidden structures in unlabeled data. Includes Clustering (K-Means) and Dimensionality Reduction (PCA).\n' +
      '• Overfitting: Model memorizes training noise instead of learning generalization, performing poorly on validation tests (remedy: Regularization, more data).\n' +
      '• Underfitting: Model is too simple to capture trends (remedy: increase model parameters).',
    analysis: 'ML Engineering:\n\n' +
      '- Q: How does Gradient Descent work in model training?\n' +
      '  A: It is an optimization algorithm that iteratively minimizes the model\'s loss function by adjusting parameters (weights) in the direction of steepest descent (negative gradient).'
  },
  {
    id: 'deep_learning',
    name: 'Deep Learning (DL)',
    category: 'Artificial Intelligence',
    keywords: [
      'deep learning', 'dl', 'backpropagation', 'activation functions', 'relu sigmoid', 'cnn rnn transformers'
    ],
    simple: 'Deep Learning is a subset of Machine Learning powered by Artificial Neural Networks with multiple hidden layers, capable of learning high-level representations from massive unstructured datasets.',
    detailed: 'Deep Learning Architectures:\n\n' +
      '• Core Components: Input layer, Hidden layers, Weights, Biases, Activation Functions, and Output layer.\n' +
      '• Key Activation Functions: ReLU (rectified linear unit, prevents vanishing gradients), Sigmoid (maps values to 0-1 range), and Softmax (outputs probability distribution).\n' +
      '• Architectures: CNNs (spatial processing for images), RNNs (sequential processing), and Transformers (self-attention mechanism for text/NLP).',
    analysis: 'Training Mechanics:\n\n' +
      '- Backpropagation: Core training algorithm that calculates the gradient of the loss function with respect to weights using calculus chain-rule, adjusting weights backward from output to inputs.'
  },
  {
    id: 'neural_networks',
    name: 'Neural Networks',
    category: 'Artificial Intelligence',
    keywords: [
      'neural networks', 'ann', 'perceptrons', 'hidden layers', 'weights biases'
    ],
    simple: 'Artificial Neural Networks (ANNs) are computational models inspired by the biological structures of the human brain, composed of interconnected processing units called neurons.',
    detailed: 'Neural Network Structures:\n\n' +
      '• Perceptron: The simplest single-layer neural node that aggregates inputs, applies a weight, adds a bias, and passes the sum through an activation function.\n' +
      '• Multi-Layer Perceptron (MLP): Encompasses hidden layers allowing networks to solve non-linear separation problems (like the XOR problem).',
    analysis: 'Optimizer Functions:\n\n' +
      '- Optimizers (like Adam, SGD) adjust learning rates and step sizes dynamically to locate the global minimum of the loss function.'
  },
  {
    id: 'computer_vision',
    name: 'Computer Vision',
    category: 'Artificial Intelligence',
    keywords: [
      'computer vision', 'opencv', 'cnn cv', 'image classification', 'object detection'
    ],
    simple: 'Computer Vision is a field of AI that trains computers to extract, process, and understand visual information from digital images, video streams, and cameras.',
    detailed: 'Computer Vision Tasks:\n\n' +
      '• Image Classification: Identifying what label describes an image.\n' +
      '• Object Detection: Identifying what items exist and mapping their coordinates using bounding boxes (YOLO, SSD).\n' +
      '• Segmentation: Identifying exact pixel outlines of objects.\n' +
      '• Tools: OpenCV (computer vision image manipulation library), PyTorch, TensorFlow.',
    analysis: 'Convolutional Neural Networks (CNNs):\n\n' +
      '- Uses kernels/filters that slide across images to extract spatial edge and texture features, down-sampling pixels using Pooling layers.'
  },
  {
    id: 'nlp',
    name: 'Natural Language Processing (NLP)',
    category: 'Artificial Intelligence',
    keywords: [
      'nlp', 'natural language processing', 'tokenization', 'lemmatization', 'word embedding', 'transformers nlp'
    ],
    simple: 'Natural Language Processing (NLP) is a field of artificial intelligence that focuses on enabling computers to read, analyze, understand, and generate human languages.',
    detailed: 'NLP Workflows:\n\n' +
      '• Preprocessing: Tokenization (splitting sentences to words), Stop-words removal, Stemming/Lemmatization (reducing words to root form).\n' +
      '• Embeddings: Converting text strings into high-dimensional vector representations capturing semantic meaning (Word2Vec, BERT).\n' +
      '• Transformers: Leveraging Self-Attention mechanisms to process entire sentences concurrently, capturing context.',
    analysis: 'Modern LLMs:\n\n' +
      '- Generative pre-trained transformers (GPT, Gemini) predict the next most probable token in a sequence based on massive pre-trained dataset weights.'
  },
  {
    id: 'project_docs',
    name: 'Project Documentation & System Info',
    category: 'Project Knowledge Base',
    keywords: [
      'project documentation', 'project info', 'voice assistant', 'knowledge base', 'offline ai', 
      'system architecture', 'app overview', 'features', 'mithun', 'productivity app'
    ],
    simple: 'This application is a 100% Offline Domain-Specific Voice Assistant & Productivity Hub built with React, TypeScript, Tailwind CSS, Web Speech API, and a custom local AI knowledge engine.',
    detailed: 'Project Technical Architecture & Features:\n\n' +
      '• Local Offline AI Engine: Domain-constrained RAG engine trained on technical CS topics, software engineering, and custom notes.\n' +
      '• Voice Assistant Panel: Hands-free voice navigation, text-to-speech with real-time word highlighting, speech-to-text input, and custom response modes (Simple, Detailed, Analysis).\n' +
      '• Modules: Productivity Dashboard, Time Management / Pomodoro, Music Player, Calendar & Tasks, Camera Feed & Person Detection, Gesture Control.',
    analysis: 'System Architecture Highlights:\n\n' +
      '1. Privacy & Offline Reliability: Performs all speech processing, command matching, and question answering strictly locally without transmitting data to cloud APIs.\n' +
      '2. Domain Enforcement: Operates with strict topic boundaries to prevent hallucinated or generic answers.\n' +
      '3. Extensible Knowledge Storage: Allows users to add custom technical notes and project documentation directly to localStorage.'
  },
  {
    id: 'postman',
    name: 'Postman API Platform',
    category: 'Software Testing & DevOps',
    keywords: [
      'postman', 'postman tool', 'api testing tool', 'postman collection', 'postman environment', 
      'rest testing postman', 'postman runner', 'postman mock server', 'postman pre-request script', 
      'postman tests', 'http requests postman', 'explain postman', 'what is postman'
    ],
    simple: 'Postman is an API platform for building, testing, documenting, and sharing APIs. It allows developers to create and execute HTTP requests (GET, POST, PUT, DELETE), validate JSON response payloads, manage environment variables, and automate API test suites.',
    detailed: 'Postman Core Features:\n\n' +
      '• Requests & Methods: Supports sending HTTP/HTTPS requests with custom headers, query params, path variables, and body formats (JSON, Form-Data, x-www-form-urlencoded).\n' +
      '• Collections & Environments: Group related API endpoints into Collections and share dynamic environment variables across development, staging, and production.\n' +
      '• Automated Testing: Write JavaScript test scripts in the "Tests" tab using pm.test() and pm.expect() assertions to validate status codes, response times, and schema structures.\n' +
      '• Collection Runner & Newman: Run entire collections sequentially and execute automated API tests in CI/CD pipelines using Newman CLI.',
    analysis: 'API Test Automation in Postman:\n\n' +
      '- Pre-request Scripts: Execute JS before a request is sent to dynamic parameters or compute auth signatures (HMAC, JWT).\n' +
      '- Assertion Script Example: pm.test("Status code is 200", function () { pm.response.to.have.status(200); });'
  },
  {
    id: 'spring',
    name: 'Spring Framework',
    category: 'Frameworks & Libraries',
    keywords: [
      'spring', 'spring framework', 'ioc container', 'dependency injection', 'spring beans', 
      'spring core', 'applicationcontext', 'spring aop', 'aspect oriented programming', 
      'bean lifecycle', 'spring annotations', 'explain spring', 'what is spring'
    ],
    simple: 'Spring is an open-source, comprehensive Java framework that provides infrastructure support for developing enterprise Java applications. Its core features are Inversion of Control (IoC) and Dependency Injection (DI), which promote loose coupling.',
    detailed: 'Spring Core Fundamentals:\n\n' +
      '• IoC Container: Manages the lifecycle, creation, configuration, and injection of application objects called Spring Beans.\n' +
      '• Dependency Injection (DI): Pattern where object dependencies are injected by the Spring container via constructor, setter, or field injection (@Autowired).\n' +
      '• Bean Lifecycle: Instantiation -> Populate Properties -> Name/Context Aware -> Pre-Initialization -> InitializingBean / Custom init-method -> Ready for use -> Destruction.\n' +
      '• Aspect-Oriented Programming (AOP): Separates cross-cutting concerns like logging, security, and transaction management using Aspects, JoinPoints, and Advices (@Before, @Around).',
    analysis: 'Spring vs Spring Boot:\n\n' +
      '- Spring Framework provides the fundamental core IoC/DI container but requires manual XML or Java configuration and boilerplate server deployment.\n' +
      '- Spring Boot builds on top of Spring to provide auto-configuration, starter dependencies, and embedded servers (Tomcat).'
  },
  {
    id: 'jpa',
    name: 'Java Persistence API (JPA)',
    category: 'Databases & ORM',
    keywords: [
      'jpa', 'java persistence api', 'entity manager', 'jpql', 'persistence unit', 
      'jpa annotations', 'entity lifecycle', 'jpa criteria api', 'explain jpa', 'what is jpa'
    ],
    simple: 'Java Persistence API (JPA) is a standard Java specification for Object-Relational Mapping (ORM) that enables developers to manage relational database data using Java domain objects (Entities) rather than raw SQL.',
    detailed: 'JPA Concepts:\n\n' +
      '• Entities & Annotations: Java classes mapped to database tables using @Entity, @Table, @Id, @GeneratedValue, @Column, @OneToMany, and @ManyToOne.\n' +
      '• EntityManager: The interface used to interact with the persistence context (find, persist, merge, remove entities).\n' +
      '• JPQL (Java Persistence Query Language): Object-oriented query language targeting Entity classes instead of database tables (e.g., SELECT e FROM Employee e WHERE e.department = :dept).\n' +
      '• Entity States: Transient (new object), Persistent (managed by EntityManager), Detached (session closed), and Removed.',
    analysis: 'JPA Performance Optimization:\n\n' +
      '- N+1 Query Problem: Occurs when fetching a collection triggers N additional queries; solved using JOIN FETCH in JPQL or Entity Graphs.\n' +
      '- Lazy vs Eager Loading: LAZY delays fetching child relationships until explicitly accessed, preventing unnecessary memory footprint.'
  },
  {
    id: 'maven',
    name: 'Apache Maven',
    category: 'Build & DevOps',
    keywords: [
      'maven', 'apache maven', 'pom.xml', 'project object model', 'maven lifecycle', 
      'maven build', 'maven dependencies', 'maven repository', 'mvn clean install', 
      'explain maven', 'what is maven'
    ],
    simple: 'Apache Maven is a popular build automation and project management tool primarily used for Java projects. It relies on a Project Object Model (pom.xml) to handle dependency management, compilation, testing, packaging, and deployment.',
    detailed: 'Maven Architecture & Lifecycle:\n\n' +
      '• pom.xml: Central configuration file containing project metadata, dependencies (groupId, artifactId, version), plugins, and build profiles.\n' +
      '• Build Lifecycle Phases: validate -> compile -> test -> package (JAR/WAR) -> verify -> install (to local repository ~/.m2) -> deploy.\n' +
      '• Dependency Management: Automatically downloads required JARs and transitive dependencies from Maven Central Repository.\n' +
      '• Key Commands: "mvn clean" (deletes target directory), "mvn compile", "mvn test", "mvn package", "mvn clean install".',
    analysis: 'Maven vs Gradle:\n\n' +
      '- Maven uses rigid XML declarations with declarative lifecycles; Gradle uses Groovy/Kotlin DSLs with incremental task graphs for faster build speeds.'
  },
  {
    id: 'opencv',
    name: 'OpenCV (Open Source Computer Vision)',
    category: 'Artificial Intelligence',
    keywords: [
      'opencv', 'open cv', 'cv2', 'computer vision library', 'image processing opencv', 
      'face detection opencv', 'contour detection', 'video processing opencv', 'explain opencv'
    ],
    simple: 'OpenCV (Open Source Computer Vision Library) is an open-source library designed for real-time computer vision, image processing, machine learning, and video analysis.',
    detailed: 'OpenCV Capabilities:\n\n' +
      '• Image Processing: Resizing, color space conversions (BGR to RGB/GRAY), blurring/smoothing (Gaussian blur), edge detection (Canny), thresholding.\n' +
      '• Object & Face Detection: Cascade classifiers (Haar Cascades) and Deep Neural Network (dnn) module for detecting faces, eyes, vehicles, and custom objects.\n' +
      '• Contour Analysis & Tracking: Finding object outlines, computing bounding boxes, measuring area/perimeter, and optical flow tracking.\n' +
      '• Video Streams: Capturing camera frames in real time, frame-by-frame processing, and writing output video files.',
    analysis: 'OpenCV Data Representation:\n\n' +
      '- Images in OpenCV are represented as multi-dimensional NumPy arrays (in Python) or cv::Mat objects (in C++), storing color intensity values (BGR format by default).'
  },
  {
    id: 'software_testing',
    name: 'Software Testing Fundamentals',
    category: 'Software Engineering & QA',
    keywords: [
      'software testing', 'testing fundamentals', 'qa', 'quality assurance', 'bug lifecycle', 
      'defect tracking', 'test cases', 'test plan', 'test strategy', 'black box testing', 
      'white box testing', 'explain software testing', 'what is software testing'
    ],
    simple: 'Software Testing is the process of evaluating and verifying that a software application works as expected, meets user requirements, and is free of defects.',
    detailed: 'Software Testing Levels & Types:\n\n' +
      '• Testing Levels: Unit Testing (individual functions), Integration Testing (combined modules), System Testing (end-to-end system), Acceptance Testing (UAT).\n' +
      '• Testing Methodologies: Black-Box Testing (testing functionality without looking at internal code), White-Box Testing (testing internal logic and code paths), Grey-Box Testing.\n' +
      '• Defect Bug Lifecycle: New -> Assigned -> Open -> Fixed -> Pending Retest -> Retest -> Verified -> Closed (or Reopened).\n' +
      '• Test Artifacts: Test Strategy, Test Plan, Test Scenario, Test Case (ID, Preconditions, Steps, Expected Result, Actual Result), Defect Report.',
    analysis: 'Testing Principles:\n\n' +
      '1. Testing shows the presence of defects, not their absence.\n' +
      '2. Exhaustive testing is impossible; risk-based testing is required.\n' +
      '3. Early testing saves time and reduces bug fixing cost exponentially.'
  }
];
