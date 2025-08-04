# Contributing to MCP HTTP Bridge

Thank you for considering contributing to MCP HTTP Bridge! We welcome contributions from the community.

## Getting Started

### Prerequisites

- Node.js 20.0.0 or higher
- npm 10.0.0 or higher

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/mcp-http-bridge.git
   cd mcp-http-bridge
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Test your changes:
   ```bash
   npm run dev -- --endpoint "https://example.com/mcp" --token "test-token"
   ```

## Making Changes

### Code Style

- Use TypeScript for all source code
- Follow the existing code style and patterns
- Ensure your code compiles without errors: `npm run build`

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add support for custom headers`
- `fix: handle connection timeout errors`
- `docs: update README with new examples`
- `test: add unit tests for bridge class`

### Testing

- Add tests for new functionality
- Ensure existing tests pass: `npm test`
- Include both unit tests and integration scenarios when applicable

## Submitting Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request with:
   - Clear description of the changes
   - Link to any related issues
   - Screenshots or examples if applicable

## Types of Contributions

### Bug Reports

When filing bug reports, please include:
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Environment details (Node.js version, OS, etc.)
- Error messages or logs

### Feature Requests

For new features, please:
- Check existing issues first
- Describe the use case and problem being solved
- Consider backward compatibility
- Provide examples of the proposed API

### Documentation

Documentation improvements are always welcome:
- Fix typos or unclear explanations
- Add usage examples
- Improve code comments
- Update README with new features

## Development Guidelines

### Architecture

The project has a simple structure:
- `src/cli.ts` - Command-line interface and argument parsing
- `src/bridge.ts` - Core bridge logic and HTTP communication
- `src/index.ts` - Main exports

### Error Handling

- Use proper TypeScript types for errors
- Provide meaningful error messages
- Handle both HTTP errors and network issues
- Follow existing retry logic patterns

### Security

- Never log or expose authentication tokens
- Validate all inputs
- Follow secure HTTP practices
- Report security issues privately

## Questions?

- Check existing [issues](https://github.com/nimbletools/mcp-http-bridge/issues)
- Open a [discussion](https://github.com/nimbletools/mcp-http-bridge/discussions)
- Review the [README](README.md) for usage examples

## License

By contributing to MCP HTTP Bridge, you agree that your contributions will be licensed under the MIT License.