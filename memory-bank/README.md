# Memory Bank System

This directory contains the persistent memory system for the Mastra Chat SDK - RoboRail Assistant project. The Memory Bank serves as the central knowledge repository for project context, architecture decisions, and development progress.

## System Overview

The Memory Bank enables **Roo** (our AI development agent) to maintain context across sessions and collaborate effectively with human developers by providing:

- **Project Context**: Goals, stakeholders, and business requirements
- **Technical Knowledge**: Architecture patterns, tech stack, and constraints  
- **Active State**: Current focus, priorities, and next steps
- **Historical Progress**: Completed milestones and lessons learned

## File Structure

### Core Memory Files

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `projectbrief.md` | Project vision, goals, and success criteria | Rarely (major scope changes only) |
| `productContext.md` | User personas, use cases, and domain knowledge | Occasionally (new requirements) |
| `systemPatterns.md` | Architecture patterns and design decisions | When architectural changes occur |
| `techContext.md` | Tech stack, dependencies, and configuration | When tools or dependencies change |
| `activeContext.md` | Current focus and immediate next steps | Frequently (during active development) |
| `progress.md` | Completed milestones and overall status | After major milestones |

## Usage Guidelines

### For AI Development Agent (Roo)

**Always read relevant Memory Bank files BEFORE starting any task:**

1. **Start with Context**: Read `projectbrief.md` and `productContext.md` to understand the project
2. **Review Architecture**: Check `systemPatterns.md` for architectural constraints and patterns
3. **Understand Tech Stack**: Review `techContext.md` for technical constraints and secret management
4. **Check Current State**: Read `activeContext.md` for current priorities and context
5. **Learn from History**: Review `progress.md` for completed work and lessons learned

**Update Memory Bank AFTER completing tasks:**

- Update `activeContext.md` with new priorities and next steps
- Update `progress.md` when completing major milestones
- Update technical files when making architectural changes

### For Human Developers

**Use the Memory Bank to:**

- **Onboard New Team Members**: Comprehensive project context in one location
- **Understand Decisions**: Historical context for why certain choices were made
- **Plan Work**: Current priorities and technical constraints
- **Maintain Consistency**: Ensure architectural patterns are followed

**Keep Memory Bank Current:**

- Update relevant files when making significant changes
- Review and validate information periodically
- Ensure consistency between Memory Bank and actual implementation

## Integration with Development Workflow

### SPARC Methodology Integration

The Memory Bank supports the SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) workflow:

1. **Specification**: Reference `projectbrief.md` and `productContext.md` for requirements
2. **Pseudocode**: Use `techContext.md` for technology constraints
3. **Architecture**: Follow patterns documented in `systemPatterns.md`
4. **Refinement**: Update `activeContext.md` with progress and learnings
5. **Completion**: Update `progress.md` with completed milestones

### Quality Standards Integration

All development must adhere to standards documented in the Memory Bank:

- **File Size Limit**: <500 lines per file (documented in `systemPatterns.md`)
- **Security**: No hardcoded secrets (strategy in `techContext.md`)
- **Modularity**: Follow architectural patterns (defined in `systemPatterns.md`)
- **Testing**: Comprehensive coverage requirements (detailed in `techContext.md`)

## Project-Specific Context

### RoboRail Assistant Domain

This Memory Bank is specifically tailored for the RoboRail Assistant project:

- **Domain**: Industrial automation and technical documentation assistance
- **Users**: RoboRail operators, field engineers, support teams
- **Technology**: Next.js 15, Mastra AI, PostgreSQL, multi-provider AI integration
- **Architecture**: Vertical slice architecture with 5 main feature slices

### Key Success Factors

1. **Modular Design**: Strict adherence to modular architecture principles
2. **Security-First**: Environment-based configuration with zero hardcoded secrets
3. **Quality Assurance**: Comprehensive testing and file size constraints
4. **User Experience**: Fast response times and seamless multi-modal interaction

## Maintenance

### Regular Reviews

- **Weekly**: Review and update `activeContext.md`
- **Monthly**: Validate technical information in `techContext.md`
- **Quarterly**: Review overall progress and update `progress.md`
- **As Needed**: Update other files when significant changes occur

### Consistency Checks

- Ensure Memory Bank reflects actual system state
- Validate that documented patterns are being followed
- Keep dependency versions and configurations current
- Maintain alignment between documentation and implementation

---

**Note**: This Memory Bank system is designed to work seamlessly with Taskmaster integration when available. The `activeContext.md` file will be enhanced with task-specific information once Taskmaster is integrated into the development workflow. 