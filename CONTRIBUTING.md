# Contributing to WIZ LAN Controller

Thank you for considering contributing to this project! This document provides guidelines for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Respect differing viewpoints

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create a detailed report** including:
   - Environment (OS, Node version, npm version)
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs/screenshots
   - Network configuration (if applicable)

### Suggesting Features

1. **Check existing issues** for similar requests
2. **Describe the use case** clearly
3. **Explain why** this feature would benefit users
4. **Provide examples** if possible

### Pull Requests

#### Before Starting

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Ensure your local environment is set up correctly

#### Development Workflow

1. **Install dependencies**:
   ```bash
   npm install
   cd frontend && npm install
   ```

2. **Start development servers**:
   ```bash
   npm run dev
   ```

3. **Make your changes**:
   - Follow existing code style
   - Write meaningful commit messages
   - Add tests for new functionality
   - Update documentation as needed

4. **Run tests**:
   ```bash
   npm test
   npm run lint
   ```

5. **Build the project**:
   ```bash
   npm run build
   ```

#### Code Style Guidelines

**TypeScript**
- Use TypeScript strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Prefer `const` over `let`
- Use async/await over promises

**React/Frontend**
- Use functional components with hooks
- Keep components focused and small
- Use TypeScript for prop types
- Follow existing naming conventions
- Use Tailwind CSS for styling

**Backend**
- Follow RESTful API conventions
- Use appropriate HTTP status codes
- Validate all inputs
- Handle errors gracefully
- Add JSDoc comments for public APIs

**Naming Conventions**
- Files: `kebab-case.ts` or `PascalCase.tsx` (components)
- Variables/functions: `camelCase`
- Classes/Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

#### Testing Guidelines

- Write unit tests for utilities and business logic
- Write integration tests for API endpoints
- Test edge cases and error conditions
- Aim for >80% code coverage
- Mock external dependencies

Example test structure:
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

#### Documentation

Update relevant documentation:
- `README.md` for user-facing changes
- `docs/PROTOCOL.md` for protocol changes
- `docs/API_EXAMPLES.md` for new API endpoints
- JSDoc comments for code-level documentation

#### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build process or tooling changes

Examples:
```
feat(scanner): add MAC OUI confidence scoring

fix(api): handle missing device state gracefully

docs(readme): add Docker deployment instructions
```

#### Pull Request Process

1. **Update your branch** with latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request** with:
   - Clear title and description
   - Reference related issues
   - List breaking changes (if any)
   - Add screenshots for UI changes

4. **Respond to feedback**:
   - Address reviewer comments
   - Push additional commits
   - Keep discussion constructive

5. **After approval**:
   - Squash commits if requested
   - Wait for maintainer to merge

## Development Tips

### Local Testing with Real Devices

1. Ensure bulbs are on the same network
2. Run scanner: `npm run cli:scan`
3. Note device IPs for testing
4. Use environment variables for test configuration

### Debugging

**Backend:**
```bash
DEBUG=wiz:* npm run dev
```

**Frontend:**
- Use React DevTools browser extension
- Check browser console for errors
- Inspect WebSocket messages in Network tab

**Network Issues:**
- Use Wireshark to capture UDP traffic on port 38899
- Check firewall settings
- Verify subnet configuration

### Performance Testing

```bash
# Scan a large subnet
npm run cli:scan -- --subnet=192.168.0.0/16

# Monitor memory usage
node --inspect src/server/index.ts
```

## Project Structure

```
wiz-lan-controller/
├── src/server/          # Backend code
├── src/shared/          # Shared types
├── src/cli/             # CLI tools
├── frontend/src/        # Frontend code
├── docs/                # Documentation
└── __tests__/           # Tests
```

## Useful Commands

```bash
# Development
npm run dev              # Start dev servers
npm run dev:server       # Backend only
npm run dev:frontend     # Frontend only

# Building
npm run build            # Build everything
npm run build:server     # Backend only
npm run build:frontend   # Frontend only

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run lint             # Lint code

# Docker
npm run docker:build     # Build image
npm run docker:run       # Run container
docker-compose up        # Run with compose

# CLI
npm run cli:scan         # Run scanner CLI
```

## Areas for Contribution

Current priorities:
- [ ] Additional unit tests
- [ ] Integration tests for API endpoints
- [ ] Support for more WIZ device types
- [ ] Scene management UI
- [ ] Device grouping features
- [ ] Export/import schedules
- [ ] Mobile-responsive improvements
- [ ] Accessibility enhancements
- [ ] Performance optimizations
- [ ] Better error messages

## Questions?

- Open an issue for discussion
- Tag maintainers for guidance
- Check existing documentation
- Review similar PRs for examples

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for making this project better! 🎉
