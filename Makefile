PYTHON ?= python3
CONFIG ?= automation_playbooks/configs/sample_scope.yaml
TIMESTAMP ?=
TRACE_ID ?=
BASELINE ?=
CANDIDATE ?=
BUNDLE ?=
FORCE ?=
REPLAY ?=

RUN_ARGS := --config $(CONFIG)
ifneq ($(strip $(TIMESTAMP)),)
RUN_ARGS += --timestamp $(TIMESTAMP)
endif
ifneq ($(strip $(TRACE_ID)),)
RUN_ARGS += --trace-id $(TRACE_ID)
endif

INGEST_ARGS :=
ifneq ($(strip $(BUNDLE)),)
INGEST_ARGS += --bundle $(BUNDLE)
endif
ifneq ($(strip $(FORCE)),)
INGEST_ARGS += --force
endif
ifneq ($(strip $(REPLAY)),)
INGEST_ARGS += --replay
endif

.PHONY: automation.run
automation.run:
	@echo "Running automation playbook with config: $(CONFIG)"
	$(PYTHON) -m automation_playbooks.scripts.run_experiment $(RUN_ARGS)

.PHONY: automation.compare
automation.compare:
	@if [ -z "$(BASELINE)" ]; then echo "BASELINE path is required"; exit 2; fi
	@if [ -z "$(CANDIDATE)" ]; then echo "CANDIDATE path is required"; exit 2; fi
	$(PYTHON) -m automation_playbooks.scripts.compare_runs --baseline $(BASELINE) --candidate $(CANDIDATE)

.PHONY: automation.ingest
automation.ingest:
	@if [ -z "$(BUNDLE)" ]; then echo "BUNDLE path is required"; exit 2; fi
	$(PYTHON) -m automation_playbooks.scripts.ingest_colab_bundle $(INGEST_ARGS)

