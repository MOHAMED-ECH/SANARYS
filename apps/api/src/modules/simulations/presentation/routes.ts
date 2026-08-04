import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  CompleteSimulationResponseSchema,
  PatchSimulationRequestSchema,
  SimulationRecordSchema,
  StartSimulationResponseSchema,
} from "@sanarys/schemas";
import { errorResponses } from "../../../shared/http/response-schemas.js";
import { replyWithDomainError } from "../../../shared/http/error-mapper.js";
import { asSimulationId } from "../domain/simulation.js";
import { simulationPresenter } from "./simulation-presenter.js";
import type { SimulationsModule } from "../index.js";

/**
 * Couche presentation du module simulations.
 *
 * Responsabilites autorisees (guide, section 4.7) : recevoir la requete,
 * valider l'entree, appeler un cas d'usage, transformer le resultat,
 * retourner la reponse. Aucun acces ORM, aucun calcul metier ici.
 */
export function createSimulationsRoutes(module: SimulationsModule): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      "/simulations",
      {
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: {
          tags: ["simulations"],
          summary: "Démarre une simulation CSPS et retourne un token de reprise",
          body: z.object({ industrialZoneId: z.string().optional() }).default({}),
          response: { 201: StartSimulationResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const result = await module.startSimulation.execute({
            industrialZoneId: request.body.industrialZoneId,
          });
          return reply.code(201).send({ id: result.id, resumeToken: result.resumeToken });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.patch(
      "/simulations/:id",
      {
        schema: {
          tags: ["simulations"],
          summary: "Sauvegarde incrémentale d'une étape du wizard",
          params: z.object({ id: z.string() }),
          body: PatchSimulationRequestSchema,
          response: { 200: z.object({ ok: z.boolean() }), ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          await module.saveSimulationStep.execute({
            id: asSimulationId(request.params.id),
            step: request.body.step,
            data: request.body.data,
          });
          return reply.send({ ok: true });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.get(
      "/simulations/:id",
      {
        schema: {
          tags: ["simulations"],
          summary: "Reprend une simulation via son token (sans compte)",
          params: z.object({ id: z.string() }),
          querystring: z.object({ resumeToken: z.string().min(10) }),
          response: { 200: SimulationRecordSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        try {
          const simulation = await module.resumeSimulation.execute({
            id: asSimulationId(request.params.id),
            resumeToken: request.query.resumeToken,
          });
          return reply.send(simulationPresenter.toRecord(simulation));
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.post(
      "/simulations/:id/complete",
      {
        config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
        schema: {
          tags: ["simulations"],
          summary: "Exécute le moteur de règles et fige le résultat (snapshot immuable)",
          params: z.object({ id: z.string() }),
          response: { 200: CompleteSimulationResponseSchema, ...errorResponses },
        },
      },
      async (request, reply) => {
        const id = asSimulationId(request.params.id);
        try {
          const result = await module.completeSimulation.execute({ id });
          return reply.send({
            id,
            result,
            pdfUrl: simulationPresenter.summaryUrl(id),
          });
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );

    app.get(
      "/simulations/:id/pdf",
      {
        schema: {
          tags: ["simulations"],
          summary: "Récapitulatif PDF de la simulation (document non contractuel)",
          params: z.object({ id: z.string() }),
          produces: ["application/pdf"],
        },
      },
      async (request, reply) => {
        try {
          const document = await module.generateSimulationSummary.execute({
            id: asSimulationId(request.params.id),
          });
          return reply
            .header("Content-Type", document.mimeType)
            .header("Content-Disposition", `attachment; filename="${document.fileName}"`)
            .send(document.bytes);
        } catch (error) {
          return replyWithDomainError(reply, error);
        }
      },
    );
  };
}
