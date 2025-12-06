# Tests Directory Customization

This file contains customization settings specific to the tests directory of the almacen.tienda Laravel project.

## Directory Purpose
The tests directory contains all test files for the Laravel application:
- Unit tests (individual classes/functions)
- Feature tests (HTTP requests, user flows)
- Integration tests (multiple components working together)
- API tests (RESTful endpoints)

## Subdirectories
- Unit/: Tests for individual classes and methods
- Feature/: Tests for user stories and application features
- Creates/: Tests for model creation and data validation
- Api/: Tests for API endpoints (if applicable)

## Laravel Testing Best Practices
- Follow PHPUnit conventions
- Use Laravel's testing helpers and assertions
- Test both positive and negative scenarios
- Keep tests focused and isolated
- Use Laravel's database transactions for testing
- Mock external services and dependencies
- Use factories for creating test data

## Common Test Types for E-commerce Application
- User registration and authentication tests
- Product catalog functionality tests
- Shopping cart operations tests
- Checkout process tests
- Payment processing tests (mocked in development)
- Order management tests
- User profile and account management tests
- Admin panel functionality tests
- API endpoints for mobile/external integrations

## Testing Commands
- php artisan test: Run all tests
- php artisan test --parallel: Run tests in parallel (faster)
- php artisan test --coverage: Generate coverage report
- phpunit tests/Feature/SpecificTest.php: Run specific test file

## Laravel Testing Helpers
- $this->get(), $this->post(), $this->put(), $this->delete() for HTTP requests
- $this->assertDatabaseHas(), $this->assertDatabaseMissing() for database assertions
- $this->actingAs() for user authentication in tests
- $this->withHeaders(), $this->withCookies() for request customization