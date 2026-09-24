export { flow, pipe } from "effect";
export * as Arr from "effect/Array";
export * as E from "effect/Either";
import * as Either from "effect/Either";
export * as O from "effect/Option";
export * as Maybe from "effect/Option";

export const parseEither = <A, ErrorType>(
  data: unknown,
): Either.Either<A, ErrorType> => {
  if (typeof data !== "object" || data === null)
    throw new Error("Invalid Either JSON");
  const objectData = data as Record<string, unknown>;
  if ("_tag" in objectData) {
    if (objectData._tag === "Right") return Either.right(objectData.right as A);
    if (objectData._tag === "Left")
      return Either.left(objectData.left as ErrorType);
    if (objectData._tag === "Ok")
      return Either.right((objectData as { value: A }).value);
    if (objectData._tag === "Err")
      return Either.left((objectData as { error: ErrorType }).error);
  }
  if ("right" in objectData) return Either.right(objectData.right as A);
  if ("left" in objectData) return Either.left(objectData.left as ErrorType);
  throw new Error("Invalid Either JSON");
};
